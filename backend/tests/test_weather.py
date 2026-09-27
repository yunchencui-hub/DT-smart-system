from datetime import datetime

from robin import db, weather
from robin.brain import Brain
from test_brain import FakeNotifier, FakeRobot

SAMPLE = {  # shape of a real Open-Meteo answer (trimmed)
    "current": {"time": "2026-10-01T13:00", "temperature_2m": 27.4, "precipitation": 0.0},
    "daily": {"time": ["2026-10-01"], "temperature_2m_max": [29.1]},
}


def test_parse_open_meteo_answer():
    assert weather.parse(SAMPLE) == (27.4, 29.1, 0.0)
    assert weather.parse({}) == (None, None, None)


def test_hot_day_adds_an_extra_water_reminder(cfg, conn):
    cfg["reminders"] = []
    now = datetime(2026, 10, 1, 14, 5).timestamp()
    db.insert_weather(conn, now - 600, *weather.parse(SAMPLE), SAMPLE)
    db.insert_telemetry(conn, "robin-test", now, {"boot": 1, "seq": 1, "ms": 999999, "n": 20, "pir": 1,
                                                  "edges": 1, "high_ms": 800, "light": 600})
    brain = Brain(cfg, conn, FakeRobot(), FakeNotifier())
    brain.tick(now)
    assert brain.robot.sent[-1] == "say 5 4000"


def test_mild_day_adds_nothing(cfg, conn):
    cfg["reminders"] = []
    now = datetime(2026, 10, 1, 14, 5).timestamp()
    mild = {"current": {"temperature_2m": 15.0}, "daily": {"temperature_2m_max": [18.0]}}
    db.insert_weather(conn, now - 600, *weather.parse(mild), mild)
    brain = Brain(cfg, conn, FakeRobot(), FakeNotifier())
    brain.tick(now)
    assert brain.extra_reminders == []
