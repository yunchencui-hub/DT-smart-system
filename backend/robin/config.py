"""Loads config.yaml on top of sensible defaults, so a missing key never crashes the system."""
from __future__ import annotations

import copy
from pathlib import Path
from typing import Any

import yaml

DEFAULTS: dict[str, Any] = {
    "device_id": "robin-01",
    "mqtt": {"host": "localhost", "port": 1883, "username": "", "password": ""},
    "database": "data/robin.db",
    "location": {"latitude": 51.44, "longitude": 5.48},
    "caregiver": {"ntfy_topic": "", "ntfy_server": "https://ntfy.sh"},
    "audio": {"durations_file": "../audio/en/durations.json", "volume": 20},
    "reminders": [],
    "presence": {"recent_motion_s": 120},
    "answers": {"timeout_s": 60, "repeats": 1},
    "anomaly": {
        "model_path": "models/anomaly.joblib",
        "window_min": 10,
        "check_every_s": 60,
        "cooldown_min": 60,
        "night_start": "23:00",
        "night_end": "06:30",
    },
    "weather": {"poll_every_min": 30, "hot_day_c": 25, "hot_day_reminder_time": "14:00"},
    "offline_alert_min": 5,
}


def _merge(base: dict, override: dict) -> dict:
    result = copy.deepcopy(base)
    for key, value in (override or {}).items():
        if isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = _merge(result[key], value)
        else:
            result[key] = value
    return result


def load_config(path: str | Path | None = "config.yaml") -> dict:
    """Returns the merged config. Relative paths inside it are resolved against the config's folder."""
    user: dict = {}
    base_dir = Path.cwd()
    if path is not None and Path(path).exists():
        user = yaml.safe_load(Path(path).read_text(encoding="utf-8")) or {}
        base_dir = Path(path).resolve().parent
    cfg = _merge(DEFAULTS, user)
    cfg["_base_dir"] = str(base_dir)
    return cfg


def resolve(cfg: dict, relative: str) -> Path:
    """Turns a path from the config into an absolute path (relative to config.yaml's folder)."""
    p = Path(relative)
    return p if p.is_absolute() else Path(cfg.get("_base_dir", ".")) / p


def topic(cfg: dict, leaf: str, device: str | None = None) -> str:
    return f"robin/{device or cfg['device_id']}/{leaf}"
