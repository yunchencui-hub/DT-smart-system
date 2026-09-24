import numpy as np
import pandas as pd
import pytest

from robin.model import AnomalyModel, HourlyBaseline
from robin.processing import FEATURES
from robin.train import inject_anomalies, split_by_day


def normal_days(days=6, seed=0):
    """Windows of a regular life: active and bright by day, dark and still at night."""
    rng = np.random.default_rng(seed)
    records = []
    start = 1_700_000_400
    for i in range(days * 144):
        t = start + i * 600
        hour = (i % 144) / 6
        day = 7 <= hour < 22
        motion = float(np.clip(rng.normal(0.3 if day else 0.01, 0.08 if day else 0.01), 0, 1))
        records.append({
            "window_start": t, "hour": int(hour),
            "motion_ratio": motion, "motion_rate": motion * 10,
            "light": float(np.clip(rng.normal(55 if day else 2, 8 if day else 1), 0, 100)),
            "hour_sin": np.sin(2 * np.pi * hour / 24), "hour_cos": np.cos(2 * np.pi * hour / 24),
            "quiet_min": float(rng.uniform(0, 20) if day else rng.uniform(60, 360)),
        })
    return pd.DataFrame(records)


def test_normal_data_rarely_triggers_and_injected_anomalies_are_caught():
    windows = normal_days()
    train, test = windows.iloc[: 5 * 144], windows.iloc[5 * 144:]
    model = AnomalyModel("iforest", contamination=0.01).fit(train)
    assert model.predict(test).mean() < 0.05

    injected = inject_anomalies(train, test, HourlyBaseline().fit(train))
    assert (model.score(injected["night_activity"]) < 0).mean() > 0.9
    assert model.inactive(injected["3h_inactivity"]).mean() > 0.9
    assert model.predict(injected["3h_inactivity"]).mean() > 0.9


def test_lof_variant_works_and_explanations_are_readable():
    windows = normal_days(days=3)
    model = AnomalyModel("lof").fit(windows)
    assert model.score(windows.iloc[:5]).shape == (5,)
    text = model.explain(windows.iloc[60])
    assert "movement" in text and "usual" in text and "limit" in text


def test_save_and_load_roundtrip(tmp_path):
    windows = normal_days(days=2)
    model = AnomalyModel().fit(windows, device="robin-test")
    path = tmp_path / "m.joblib"
    model.save(path)
    loaded = AnomalyModel.load(path)
    assert loaded.meta["device"] == "robin-test"
    np.testing.assert_allclose(loaded.score(windows[FEATURES + ["hour", "quiet_min"]]), model.score(windows))


def test_unknown_algorithm_is_refused():
    with pytest.raises(ValueError):
        AnomalyModel("magic")


def test_split_keeps_last_day_for_testing():
    windows = normal_days(days=4)
    train, test = split_by_day(windows, test_days=1)
    assert len(train) + len(test) == len(windows)
    assert train["window_start"].max() < test["window_start"].min()
