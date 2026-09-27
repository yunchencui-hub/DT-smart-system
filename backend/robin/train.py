"""Train + evaluate the anomaly model on the robot's OWN recorded data.

    python -m robin train                      # uses all data of device_id from config.yaml
    python -m robin train --algorithm lof      # compare another algorithm
    python -m robin train --window-min 5 --contamination 0.01

How we evaluate without real emergencies:
  1. False alarms: how often does the model flag the most recent NORMAL day(s)? (held out, not trained on)
  2. Injected anomalies: copy real windows from that held-out data and change them into
       a) "movement + lights on at night"                          (night-time wandering)
       b) "no movement for 3 hours during normally active hours"   (fall / illness)
     and measure how many each detector catches.
  3. Optional staged anomalies you really performed: list them in data/labels.csv
       start,end,label
       2026-10-12 10:00,2026-10-12 10:40,staged_inactivity
"""
from __future__ import annotations

import csv
import json
import logging
import time
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd

from . import db
from .config import resolve
from .model import AnomalyModel, HourlyBaseline
from .processing import clean, load_telemetry, make_windows

log = logging.getLogger(__name__)
NIGHT_HOURS = {0, 1, 2, 3, 4, 5}


def load_labels(path: Path) -> list[tuple[float, float, str]]:
    if not path.exists():
        return []
    labels = []
    with path.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            start = datetime.strptime(row["start"].strip(), "%Y-%m-%d %H:%M").timestamp()
            end = datetime.strptime(row["end"].strip(), "%Y-%m-%d %H:%M").timestamp()
            labels.append((start, end, row.get("label", "anomaly").strip()))
    return labels


def mark_labeled(windows: pd.DataFrame, labels, window_s: float) -> np.ndarray:
    flagged = np.zeros(len(windows), dtype=bool)
    for start, end, _ in labels:
        flagged |= ((windows["window_start"] < end) & (windows["window_start"] + window_s > start)).to_numpy()
    return flagged


def split_by_day(windows: pd.DataFrame, test_days: int) -> tuple[pd.DataFrame, pd.DataFrame]:
    days = windows["window_start"].map(lambda t: time.strftime("%Y-%m-%d", time.localtime(t)))
    unique_days = sorted(days.unique())
    if len(unique_days) >= test_days + 2:
        test_set = set(unique_days[-test_days:])
        is_test = days.isin(test_set)
    else:  # not enough whole days yet: last 20 % of the time is the test set
        is_test = pd.Series(np.arange(len(windows)) >= int(len(windows) * 0.8), index=windows.index)
    return windows[~is_test].reset_index(drop=True), windows[is_test].reset_index(drop=True)


def inject_anomalies(train: pd.DataFrame, test: pd.DataFrame, baseline: HourlyBaseline) -> dict[str, pd.DataFrame]:
    """Makes realistic fake anomalies out of real held-out windows."""
    day = train[~train["hour"].isin(NIGHT_HOURS)]
    night = test[test["hour"].isin(NIGHT_HOURS)].copy()
    if not day.empty:
        night["motion_ratio"] = day["motion_ratio"].quantile(0.9)
        night["motion_rate"] = day["motion_rate"].quantile(0.9)
        night["light"] = day["light"].quantile(0.75)
        night["quiet_min"] = 0.0

    hourly_motion = baseline.mean["motion_ratio"]
    active_hours = set(hourly_motion[hourly_motion >= hourly_motion.median()].index) - NIGHT_HOURS
    inactive = test[test["hour"].isin(active_hours)].copy()
    inactive["motion_ratio"] = 0.0
    inactive["motion_rate"] = 0.0
    inactive["quiet_min"] = 180.0
    return {"night_activity": night, "3h_inactivity": inactive}


def detectors(train: pd.DataFrame, algorithm: str, contamination: float) -> dict:
    """Every candidate, trained on the same data, as a function windows -> True/False per window."""
    iforest = AnomalyModel("iforest", contamination).fit(train)
    lof = AnomalyModel("lof", contamination).fit(train)
    deployed = iforest if algorithm == "iforest" else lof
    return {
        "iforest_only": lambda w: iforest.score(w) < 0,
        "lof_only": lambda w: lof.score(w) < 0,
        "hourly_zscore": iforest.baseline.predict,
        "inactivity_rule": iforest.baseline.inactive,
        f"DEPLOYED({algorithm}+rule)": deployed.predict,
    }


def evaluate(train, test, injected, algorithm, contamination) -> dict:
    return {name: _rates(predict, test, injected)
            for name, predict in detectors(train, algorithm, contamination).items()}


def _rates(predict, test, injected) -> dict:
    out = {"false_alarm_rate": round(float(predict(test).mean()), 3) if len(test) else None}
    for kind, frame in injected.items():
        out[f"detect_{kind}"] = round(float(predict(frame).mean()), 3) if len(frame) else None
    return out


def save_plots(windows: pd.DataFrame, model: AnomalyModel, test: pd.DataFrame, out_dir: Path) -> list[str]:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    files = []
    profile = windows.groupby("hour")[["motion_ratio", "light"]].agg(["mean", "std"]).reindex(range(24))
    fig, ax1 = plt.subplots(figsize=(9, 4))
    hours = profile.index
    m, s = profile[("motion_ratio", "mean")] * 100, profile[("motion_ratio", "std")].fillna(0) * 100
    ax1.plot(hours, m, color="tab:blue", label="movement (% of time)")
    ax1.fill_between(hours, (m - s).clip(lower=0), m + s, color="tab:blue", alpha=0.2)
    ax1.set_xlabel("hour of day")
    ax1.set_ylabel("movement %")
    ax2 = ax1.twinx()
    ax2.plot(hours, profile[("light", "mean")], color="tab:orange", label="light %")
    ax2.set_ylabel("light %")
    ax1.set_title("What a normal day looks like (mean +- 1 std)")
    fig.legend(loc="upper left", bbox_to_anchor=(0.08, 0.88))
    fig.tight_layout()
    files.append(str(out_dir / "hourly_profile.png"))
    fig.savefig(files[-1], dpi=120)
    plt.close(fig)

    if len(test):
        fig, ax = plt.subplots(figsize=(9, 3.5))
        local_tz = datetime.now().astimezone().tzinfo
        when = pd.to_datetime(test["window_start"], unit="s", utc=True).dt.tz_convert(local_tz)
        ax.plot(when, model.score(test), marker=".", linewidth=0.8)
        ax.axhline(0, color="red", linestyle="--", label="anomaly threshold")
        ax.set_ylabel("score (higher = more normal)")
        ax.set_title("Anomaly score on held-out days (local time)")
        ax.legend()
        fig.autofmt_xdate()
        fig.tight_layout()
        files.append(str(out_dir / "test_scores.png"))
        fig.savefig(files[-1], dpi=120)
        plt.close(fig)
    return files


def run(cfg: dict, window_min: float | None = None, algorithm: str = "iforest", contamination: float = 0.02,
        test_days: int = 1, allow_synthetic: bool = False) -> dict:
    device = cfg["device_id"]
    if device.startswith("sim") and not allow_synthetic:
        raise SystemExit(
            f"device_id '{device}' is the SIMULATOR. The assignment requires training on data from YOUR OWN "
            "sensor. Set device_id to your robot, or pass --allow-synthetic for a dry run only."
        )
    window_min = window_min or cfg["anomaly"]["window_min"]
    conn = db.connect(resolve(cfg, cfg["database"]))
    raw = load_telemetry(conn, device)
    if raw.empty:
        raise SystemExit(f"No telemetry for device '{device}' yet. Run the robot + `python -m robin ingest` first.")

    windows = make_windows(clean(raw), window_min)
    labels = load_labels(resolve(cfg, "data/labels.csv"))
    labeled = mark_labeled(windows, labels, window_min * 60)
    normal = windows[~labeled].reset_index(drop=True)
    staged = windows[labeled].reset_index(drop=True)
    if len(normal) < 50:
        raise SystemExit(f"Only {len(normal)} usable windows. Collect more data (aim for >= 3 days).")

    train, test = split_by_day(normal, test_days)
    injected = inject_anomalies(train, test, HourlyBaseline().fit(train))
    if len(staged):
        injected["staged_real"] = staged
    comparison = evaluate(train, test, injected, algorithm, contamination)

    span = f"{time.strftime('%Y-%m-%d %H:%M', time.localtime(raw['ts'].min()))} .. " \
           f"{time.strftime('%Y-%m-%d %H:%M', time.localtime(raw['ts'].max()))}"
    final = AnomalyModel(algorithm, contamination).fit(
        normal, device=device, window_min=window_min, data_span=span, synthetic=device.startswith("sim"))
    model_path = resolve(cfg, cfg["anomaly"]["model_path"])
    final.save(model_path)

    report_dir = resolve(cfg, "reports")
    report_dir.mkdir(parents=True, exist_ok=True)
    plots = save_plots(normal, final, test, report_dir)
    metrics = {
        "device": device, "data_span": span, "raw_rows": int(len(raw)), "windows": int(len(windows)),
        "train_windows": int(len(train)), "test_windows": int(len(test)), "staged_windows": int(len(staged)),
        "window_min": window_min, "deployed_algorithm": algorithm, "contamination": contamination,
        "injected_counts": {k: int(len(v)) for k, v in injected.items()},
        "inactivity_limits_min": {int(h): round(float(v), 1) for h, v in final.baseline.quiet_limit.items()},
        "comparison": comparison, "model_path": str(model_path), "plots": plots,
    }
    (report_dir / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    _print_summary(metrics)
    return metrics


def _print_summary(m: dict) -> None:
    print(f"\nData: {m['raw_rows']} messages -> {m['windows']} windows of {m['window_min']} min ({m['data_span']})")
    print(f"Train {m['train_windows']} / test {m['test_windows']} windows, staged real anomalies: {m['staged_windows']}\n")
    keys = list(next(iter(m["comparison"].values())))
    print(f"{'detector':<26}" + "".join(f"{k:>24}" for k in keys))
    for name, r in m["comparison"].items():
        print(f"{name:<26}" + "".join(f"{str(r[k]):>24}" for k in keys))
    print(f"(injected windows: {m['injected_counts']})")
    print("\nfalse_alarm_rate: lower is better. detect_*: higher is better.")
    print(f"Saved {m['deployed_algorithm']} model -> {m['model_path']}, report -> reports/metrics.json + plots")
