"""Smart algorithm: learns what a NORMAL day looks like from the robot's OWN history, and flags
what is not normal. Two dangers, two detectors:

  1. "Something unusual is happening right now" (e.g. movement + lights on at 03:00 = wandering at night)
     -> an unsupervised outlier model over all features TOGETHER. IsolationForest by default,
        LocalOutlierFactor as a comparison. Besides the raw features it gets two CONTEXT features:
        how many std's movement and light are away from what is usual for this hour. Without them the
        forest misses "normal value, wrong time" anomalies, because it splits one feature at a time.
  2. "Nothing has happened for far too long" (e.g. no movement for 3 h at 10:00 = fall or illness?)
     -> a per-hour inactivity limit learned from the data: longer than ~ever seen at this hour.
        (The assignment's "periodically reviewed threshold", but learned instead of guessed.)

HourlyBaseline also gives z-scores per hour (mean +- k*std): our simple benchmark and the source of
human-readable explanations for the caregiver.
Why unsupervised? We have lots of normal data but (luckily) almost no real emergencies to label.
"""
from __future__ import annotations

import os
import time
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from .processing import FEATURES

MIN_STD = {"motion_ratio": 0.03, "light": 3.0}  # avoid dividing by ~0 for very regular hours
INACTIVITY_QUANTILE = 0.99                       # "longer than 99 % of what we saw at this hour"
INACTIVITY_MARGIN = 1.2                          # ... plus 20 % margin
MIN_INACTIVITY_LIMIT = 30.0                      # never alarm on less than 30 minutes of quiet


class HourlyBaseline:
    def __init__(self, k: float = 3.0):
        self.k = k
        self.mean: pd.DataFrame | None = None
        self.std: pd.DataFrame | None = None
        self.quiet_limit: pd.Series | None = None

    def fit(self, windows: pd.DataFrame) -> "HourlyBaseline":
        grouped = windows.groupby("hour")
        self.mean = grouped[list(MIN_STD)].mean()
        std = grouped[list(MIN_STD)].std().fillna(0.0)
        for column, floor in MIN_STD.items():
            std[column] = std[column].clip(lower=floor)
        self.std = std
        limit = grouped["quiet_min"].quantile(INACTIVITY_QUANTILE) * INACTIVITY_MARGIN
        self.quiet_limit = limit.clip(lower=MIN_INACTIVITY_LIMIT)
        return self

    def zscores(self, windows: pd.DataFrame) -> pd.DataFrame:
        mean = self.mean.reindex(windows["hour"]).to_numpy()
        std = self.std.reindex(windows["hour"]).to_numpy()
        z = (windows[list(MIN_STD)].to_numpy(dtype=float) - mean) / std
        return pd.DataFrame(np.nan_to_num(z), columns=list(MIN_STD), index=windows.index)

    def predict(self, windows: pd.DataFrame) -> np.ndarray:
        """Benchmark detector: movement or light more than k std away from this hour's mean."""
        return (self.zscores(windows).abs() > self.k).any(axis=1).to_numpy()

    def inactive(self, windows: pd.DataFrame) -> np.ndarray:
        limit = self.quiet_limit.reindex(windows["hour"]).to_numpy(dtype=float)
        return windows["quiet_min"].to_numpy(dtype=float) > limit  # unknown hour -> NaN -> False

    def explain(self, row: pd.Series) -> str:
        hour = int(row["hour"])
        if self.mean is None or hour not in self.mean.index:
            return f"no history for {hour:02d}:00 yet"
        m, s = self.mean.loc[hour], self.std.loc[hour]
        text = (f"movement {row['motion_ratio']:.0%} of the time (usual at {hour:02d}h: "
                f"{m['motion_ratio']:.0%} +- {s['motion_ratio']:.0%}), light {row['light']:.0f}% "
                f"(usual {m['light']:.0f}% +- {s['light']:.0f}%)")
        if "quiet_min" in row:
            text += f", no movement for {row['quiet_min']:.0f} min (limit {self.quiet_limit.loc[hour]:.0f})"
        return text


def _make_detector(algorithm: str, contamination: float, random_state: int):
    if algorithm == "iforest":
        # Trees split on one feature at a time, so feature scaling does not matter here.
        return Pipeline([("model", IsolationForest(n_estimators=200, contamination=contamination,
                                                   random_state=random_state))])
    if algorithm == "lof":
        # LOF measures DISTANCES between points, so all features must be on the same scale.
        return Pipeline([("scale", StandardScaler()),
                         ("model", LocalOutlierFactor(n_neighbors=20, contamination=contamination,
                                                      novelty=True))])
    raise ValueError(f"unknown algorithm {algorithm!r} (use iforest or lof)")


class AnomalyModel:
    def __init__(self, algorithm: str = "iforest", contamination: float = 0.02, random_state: int = 42):
        self.algorithm = algorithm
        self.contamination = contamination
        self.detector = _make_detector(algorithm, contamination, random_state)
        self.baseline = HourlyBaseline()
        self.meta: dict = {}

    def _matrix(self, windows: pd.DataFrame) -> np.ndarray:
        """Model input = raw features + "how unusual for this hour" (z-scores from the baseline)."""
        context = self.baseline.zscores(windows).to_numpy(dtype=float)
        return np.column_stack([windows[FEATURES].to_numpy(dtype=float), context])

    def fit(self, windows: pd.DataFrame, **meta) -> "AnomalyModel":
        self.baseline.fit(windows)  # first: the detector uses the baseline's z-scores as input
        self.detector.fit(self._matrix(windows))
        self.meta = {"trained_at": time.time(), "windows": int(len(windows)), "algorithm": self.algorithm,
                     "contamination": self.contamination, **meta}
        return self

    def score(self, windows: pd.DataFrame) -> np.ndarray:
        """Outlier score of the current window. Higher = more normal, below 0 = unusual."""
        return self.detector.decision_function(self._matrix(windows))

    def inactive(self, windows: pd.DataFrame) -> np.ndarray:
        return self.baseline.inactive(windows)

    def predict(self, windows: pd.DataFrame) -> np.ndarray:
        return (self.score(windows) < 0) | self.inactive(windows)

    def explain(self, row: pd.Series) -> str:
        return self.baseline.explain(row)

    def save(self, path: str | Path) -> None:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_name(path.name + ".tmp")
        joblib.dump(self, tmp)
        os.replace(tmp, path)   # a running brain never sees a half-written model file

    @staticmethod
    def load(path: str | Path) -> "AnomalyModel":
        return joblib.load(path)
