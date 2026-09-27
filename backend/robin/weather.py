"""Second data source: the free Open-Meteo API (no key needed). Pulled in batch every 30 minutes."""
from __future__ import annotations

import logging
import threading
import time

import requests

from . import db

log = logging.getLogger(__name__)
URL = "https://api.open-meteo.com/v1/forecast"


def fetch(latitude: float, longitude: float, timeout: float = 10) -> dict:
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,precipitation",
        "daily": "temperature_2m_max",
        "timezone": "auto",
        "forecast_days": 1,
    }
    response = requests.get(URL, params=params, timeout=timeout)
    response.raise_for_status()
    return response.json()


def parse(data: dict) -> tuple[float | None, float | None, float | None]:
    current = data.get("current", {})
    daily_max = (data.get("daily", {}).get("temperature_2m_max") or [None])[0]
    return current.get("temperature_2m"), daily_max, current.get("precipitation")


def fetch_and_store(cfg: dict, conn) -> bool:
    try:
        data = fetch(cfg["location"]["latitude"], cfg["location"]["longitude"])
        temp, temp_max, precip = parse(data)
        db.insert_weather(conn, time.time(), temp, temp_max, precip, data)
        log.info("weather: now %s C, max today %s C, rain %s mm", temp, temp_max, precip)
        return True
    except (requests.RequestException, ValueError) as exc:  # no internet = keep going without weather
        log.warning("weather fetch failed: %s", exc)
        return False


def start_polling(cfg: dict, db_path: str, stop: threading.Event) -> threading.Thread:
    def run():
        conn = db.connect(db_path)  # SQLite connections are per thread
        period = float(cfg["weather"]["poll_every_min"]) * 60
        while not stop.is_set():
            fetch_and_store(cfg, conn)
            stop.wait(period)

    thread = threading.Thread(target=run, name="weather", daemon=True)
    thread.start()
    return thread
