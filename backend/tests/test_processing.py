import numpy as np
import pandas as pd
import pytest

from robin.processing import (QUIET_CAP_MIN, clean, features_for_window, make_windows, quality_report,
                              quiet_minutes)

T0 = 1_700_000_400.0  # divisible by 600, so this is the start of a 10-minute window


def rows(count, start=T0, **overrides):
    data = {"ts": start + np.arange(count) * 2.0, "boot": 1, "seq": np.arange(count),
            "dev_ms": 120000 + np.arange(count) * 2000, "n": 20, "pir": 0, "edges": 0, "high_ms": 0,
            "light": 511, "rssi": -60}
    data.update(overrides)
    return pd.DataFrame(data)


def test_clean_removes_duplicates_warmup_and_impossible_values():
    df = rows(5)
    df.loc[0, "dev_ms"] = 10_000               # still warming up
    df.loc[1, "high_ms"] = 99_999              # longer than the 2 s that were sampled
    df = pd.concat([df, df.iloc[[2]]])          # duplicate message
    out = clean(df)
    assert len(out) == 4
    assert out["high_ms"].max() == 20 * 100


def test_window_features_are_computed_correctly():
    df = rows(300)                              # exactly 10 minutes
    df.loc[df.index % 2 == 0, "high_ms"] = 1000  # moving half of the time for 1 of 2 s
    df.loc[df.index % 2 == 0, "edges"] = 1
    df.loc[df.index % 2 == 0, "pir"] = 1
    w = make_windows(df, window_min=10)
    assert len(w) == 1
    r = w.iloc[0]
    assert r["coverage"] == pytest.approx(1.0)
    assert r["motion_ratio"] == pytest.approx(150 * 1000 / (300 * 2000))  # 0.25
    assert r["motion_rate"] == pytest.approx(150 / 10)                     # 15 per minute
    assert r["light"] == pytest.approx(511 / 1023 * 100)
    assert -1 <= r["hour_sin"] <= 1 and -1 <= r["hour_cos"] <= 1
    assert r["quiet_min"] == pytest.approx((T0 + 600 - (T0 + 596)) / 60)    # last move at message 298


def test_windows_with_big_gaps_are_dropped():
    w = make_windows(rows(100), window_min=10)  # 100 messages = 33 % coverage
    assert w.empty


def test_live_window_matches_training_window():
    df = rows(300, high_ms=500, edges=1, pir=1)
    train = make_windows(df, window_min=10).iloc[0]
    live = features_for_window(df, T0 + 599.0, window_min=10, last_motion_ts=T0 + 598).iloc[0]
    for col in ("motion_ratio", "motion_rate", "light"):
        assert live[col] == pytest.approx(train[col])


def test_quiet_minutes():
    motion = np.array([0.0, 600.0])
    assert quiet_minutes(motion, np.array([900.0]))[0] == pytest.approx(5.0)
    assert quiet_minutes(motion, np.array([-60.0]))[0] == QUIET_CAP_MIN   # nothing seen yet
    assert quiet_minutes(np.array([]), np.array([1.0]))[0] == QUIET_CAP_MIN


def test_quality_report_counts_lost_messages_and_reboots():
    df = rows(10)
    df = df[~df["seq"].isin([3, 4])]            # two messages lost in WiFi
    df = pd.concat([df, rows(3, start=T0 + 100, boot=2)])
    q = quality_report(df)
    assert q["lost"] == 2
    assert q["reboots"] == 1
    assert q["loss_pct"] == pytest.approx(100 * 2 / 13, abs=0.01)
