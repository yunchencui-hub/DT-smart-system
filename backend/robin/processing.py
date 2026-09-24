"""Processing component: raw telemetry rows -> clean data -> feature windows the model understands.

    raw rows (every 2 s)  --clean-->  rows  --window (10 min)-->  one feature row per window

Features per window (all independent of the window length, so a model trained on 10-minute
windows can also score a 2-minute demo window):
    motion_ratio  fraction of the time the PIR saw movement (0..1)
    motion_rate   new movements per minute
    light         average light level in % (0 = dark, 100 = very bright)
    hour_sin/cos  time of day on a circle, so 23:59 and 00:01 are neighbours
plus, for the separate inactivity check (not a model input):
    quiet_min     minutes since the PIR last saw movement (capped at QUIET_CAP_MIN)
"""
from __future__ import annotations

import math
import time

import numpy as np
import pandas as pd

FEATURES = ["motion_ratio", "motion_rate", "light", "hour_sin", "hour_cos"]
PUBLISH_S = 2.0      # firmware PUBLISH_MS
SAMPLE_MS = 100      # firmware SAMPLE_MS
WARMUP_S = 60        # a PIR gives random output for ~1 minute after power-up
QUIET_CAP_MIN = 360  # "no movement for 6 hours or more" is all the same to us

COLUMNS = ["ts", "boot", "seq", "dev_ms", "n", "pir", "edges", "high_ms", "light", "rssi"]


def load_telemetry(conn, device: str, start_ts: float | None = None, end_ts: float | None = None) -> pd.DataFrame:
    query = f"SELECT {', '.join(COLUMNS)} FROM telemetry WHERE device=?"
    params: list = [device]
    if start_ts is not None:
        query += " AND ts>=?"
        params.append(start_ts)
    if end_ts is not None:
        query += " AND ts<=?"
        params.append(end_ts)
    rows = conn.execute(query + " ORDER BY ts", params).fetchall()
    return pd.DataFrame([tuple(r) for r in rows], columns=COLUMNS)


def clean(df: pd.DataFrame, warmup_s: float = WARMUP_S) -> pd.DataFrame:
    """Removes duplicates, PIR warm-up rows, and physically impossible values."""
    if df.empty:
        return df.copy()
    out = df.drop_duplicates(subset=["boot", "seq"])
    out = out.dropna(subset=["ts", "n", "pir", "edges", "high_ms", "light"])
    out = out[out["dev_ms"] >= warmup_s * 1000]
    out = out[out["n"] > 0].copy()
    out["light"] = out["light"].clip(0, 1023)
    out["high_ms"] = np.minimum(out["high_ms"], out["n"] * SAMPLE_MS)  # can't be HIGH longer than sampled
    return out.sort_values("ts").reset_index(drop=True)


def local_hour(ts: float) -> float:
    t = time.localtime(ts)
    return t.tm_hour + t.tm_min / 60.0


def _add_features(out: pd.DataFrame, window_s: float, mid_ts: pd.Series) -> pd.DataFrame:
    sampled_ms = out["samples"] * SAMPLE_MS
    out["coverage"] = (out["messages"] * PUBLISH_S / window_s).clip(upper=1.0)
    out["motion_ratio"] = (out["high_ms"] / sampled_ms).clip(0, 1)
    out["motion_rate"] = out["edges"] / (sampled_ms / 60000.0)
    out["light"] = out["light_raw"] / 1023.0 * 100.0
    hours = np.array([local_hour(t) for t in mid_ts])
    out["hour"] = np.floor(hours).astype(int)
    out["hour_sin"] = np.sin(2 * math.pi * hours / 24.0)
    out["hour_cos"] = np.cos(2 * math.pi * hours / 24.0)
    return out


def quiet_minutes(motion_ts: np.ndarray, at_ts: np.ndarray) -> np.ndarray:
    """Minutes since the last movement before each moment in at_ts (motion_ts must be sorted)."""
    if len(motion_ts) == 0:
        return np.full(len(at_ts), float(QUIET_CAP_MIN))
    idx = np.searchsorted(motion_ts, at_ts, side="right") - 1
    last = motion_ts[np.clip(idx, 0, None)]
    quiet = np.where(idx >= 0, (at_ts - last) / 60.0, QUIET_CAP_MIN)
    return np.clip(quiet, 0, QUIET_CAP_MIN)


def make_windows(df: pd.DataFrame, window_min: float = 10, min_coverage: float = 0.5) -> pd.DataFrame:
    """Groups clean rows into fixed windows. Windows with too little data (gaps) are dropped."""
    window_s = window_min * 60
    empty = pd.DataFrame(columns=["window_start", "messages", "coverage", "hour", "quiet_min", *FEATURES])
    if df.empty:
        return empty
    start = (df["ts"] // window_s) * window_s
    grouped = df.groupby(start)
    out = pd.DataFrame({
        "messages": grouped.size(),
        "samples": grouped["n"].sum(),
        "high_ms": grouped["high_ms"].sum(),
        "edges": grouped["edges"].sum(),
        "light_raw": grouped["light"].mean(),
    })
    out.index.name = "window_start"
    out = out.reset_index()
    out = _add_features(out, window_s, out["window_start"] + window_s / 2)
    moving = df[(df["edges"] > 0) | (df["pir"] == 1)]["ts"].to_numpy(dtype=float)
    out["quiet_min"] = quiet_minutes(np.sort(moving), (out["window_start"] + window_s).to_numpy(dtype=float))
    out = out[out["coverage"] >= min_coverage].reset_index(drop=True)
    return out if not out.empty else empty


def features_for_window(df: pd.DataFrame, end_ts: float, window_min: float, last_motion_ts: float | None = None,
                        clock_offset_s: float = 0.0, min_coverage: float = 0.5) -> pd.DataFrame | None:
    """Live scoring: features of the last `window_min` minutes before end_ts (one row), or None
    when there is not enough data. clock_offset_s shifts the time of day (demo mode only)."""
    window_s = window_min * 60
    rows = df[(df["ts"] > end_ts - window_s) & (df["ts"] <= end_ts)]
    if rows.empty:
        return None
    out = pd.DataFrame({
        "window_start": [end_ts - window_s],
        "messages": [len(rows)],
        "samples": [rows["n"].sum()],
        "high_ms": [rows["high_ms"].sum()],
        "edges": [rows["edges"].sum()],
        "light_raw": [rows["light"].mean()],
    })
    out = _add_features(out, window_s, pd.Series([end_ts - window_s / 2 + clock_offset_s]))
    motion = np.array([] if last_motion_ts is None else [last_motion_ts], dtype=float)
    out["quiet_min"] = quiet_minutes(motion, np.array([end_ts], dtype=float))
    if out["coverage"].iloc[0] < min_coverage:
        return None
    return out


def quality_report(raw: pd.DataFrame) -> dict:
    """Numbers for the test plan: how complete and how regular is the data stream?"""
    if raw.empty:
        return {"messages": 0}
    expected = 0
    for _, part in raw.groupby("boot"):
        expected += int(part["seq"].max() - part["seq"].min() + 1)
    unique = len(raw.drop_duplicates(subset=["boot", "seq"]))
    gaps = raw.sort_values("ts")["ts"].diff().dropna()
    return {
        "messages": int(len(raw)),
        "duplicates": int(len(raw) - unique),
        "reboots": int(raw["boot"].nunique() - 1),
        "expected_by_seq": expected,
        "lost": int(expected - unique),
        "loss_pct": round(100.0 * (expected - unique) / expected, 2) if expected else 0.0,
        "interval_median_s": round(float(gaps.median()), 3) if len(gaps) else None,
        "interval_p95_s": round(float(gaps.quantile(0.95)), 3) if len(gaps) else None,
        "interval_max_s": round(float(gaps.max()), 1) if len(gaps) else None,
        "samples_per_msg_mean": round(float(raw["n"].mean()), 2),
        "rssi_median_dbm": float(raw["rssi"].median()) if raw["rssi"].notna().any() else None,
        "span_hours": round(float((raw["ts"].max() - raw["ts"].min()) / 3600), 2),
    }
