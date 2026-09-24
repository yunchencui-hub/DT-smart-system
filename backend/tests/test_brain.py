"""The brain is tested with a fake robot and a fake phone: every decision path, no hardware needed."""
from datetime import datetime

import numpy as np
import pytest

from conftest import telemetry
from robin import db
from robin.brain import Brain

T = datetime(2026, 10, 1, 8, 31).timestamp()   # 08:31 local, one minute after the medicine reminder


class FakeRobot:
    def __init__(self):
        self.sent = []

    def send(self, text):
        self.sent.append(text)


class FakeNotifier:
    def __init__(self):
        self.messages = []

    def send(self, level, title, message):
        self.messages.append((level, title, message))
        return True


class StubModel:
    def __init__(self, score=0.1, inactive=False):
        self._score, self._inactive = score, inactive

    def score(self, feats):
        return np.array([self._score])

    def inactive(self, feats):
        return np.array([self._inactive])

    def explain(self, row):
        return "stub explanation"


@pytest.fixture
def brain(cfg, conn):
    cfg["reminders"] = [{"name": "medicine", "time": "08:30", "track": 3, "ask": True,
                         "alert_on_no": True, "window_min": 60}]
    return Brain(cfg, conn, FakeRobot(), FakeNotifier())


def motion_at(conn, ts, seq):
    db.insert_telemetry(conn, "robin-test", ts, telemetry(seq, pir=1, edges=1, high_ms=1500))


def tick(brain, conn, ts):
    """Robot is alive: one quiet telemetry message, then the brain thinks."""
    db.insert_telemetry(conn, "robin-test", ts, telemetry(10_000 + int(ts) % 100_000))
    brain.tick(ts)


def press(conn, ts, value, eseq):
    db.insert_event(conn, "robin-test", ts, {"boot": 1, "eseq": eseq, "type": "button", "value": value})


def test_reminder_waits_for_presence_then_yes_is_reported(brain, conn):
    brain.tick(T)
    assert not any(c.startswith("ask") for c in brain.robot.sent)      # nobody in the room yet
    motion_at(conn, T + 5, 1)
    brain.tick(T + 6)
    assert brain.robot.sent[-1] == "ask 3 4000"
    press(conn, T + 10, "yes", 1)
    brain.tick(T + 11)
    assert brain.robot.sent[-1] == "say 9 4000"
    assert brain.notifier.messages[-1][0] == "info"
    assert brain.active is None


def test_no_answer_repeats_once_then_alerts(brain, conn):
    motion_at(conn, T, 1)
    brain.tick(T + 1)                                   # asks
    tick(brain, conn, T + 63)                           # 60 s timeout -> "sorry, let me ask again"
    assert brain.robot.sent[-1].startswith("say 11")
    tick(brain, conn, T + 63 + 5)                       # after the repeat sentence: ask again
    assert brain.robot.sent[-1] == "ask 3 4000"
    tick(brain, conn, T + 68 + 61)
    level, title, _ = brain.notifier.messages[-1]
    assert level == "alert" and "no answer" in title


def test_no_answer_on_important_question_alerts_family(brain, conn):
    motion_at(conn, T, 1)
    brain.tick(T + 1)
    press(conn, T + 3, "no", 1)
    brain.tick(T + 4)
    assert brain.robot.sent[-1].startswith("say 10")
    assert brain.notifier.messages[-1][0] == "alert"


def test_old_button_presses_do_not_count_as_answers(brain, conn):
    press(conn, T - 30, "yes", 1)                       # pressed before the question
    motion_at(conn, T, 1)
    brain.tick(T + 1)
    brain.tick(T + 2)
    assert brain.active is not None and brain.active.state == "asked"


def test_reminder_missed_when_nobody_comes(brain, conn):
    tick(brain, conn, T)
    tick(brain, conn, T + 3600)                         # window of 60 min is over
    level, title, _ = brain.notifier.messages[-1]
    assert level == "warning" and "missed" in title


def test_anomaly_starts_a_check_in_without_waiting_for_presence(brain, conn):
    brain.model = StubModel(score=-0.2)
    for i in range(300):                                # 10 minutes of quiet data
        db.insert_telemetry(conn, "robin-test", T - 600 + i * 2, telemetry(i))
    brain.cfg["reminders"] = []
    brain.tick(T)
    assert brain.robot.sent[-1].startswith("ask 7")     # daytime check-in question
    assert conn.execute("SELECT anomaly FROM scores").fetchone()[0] == 1
    tick(brain, conn, T + 30)                           # cooldown: no second check-in
    assert sum(c.startswith("ask 7") for c in brain.robot.sent) == 1


def test_normal_score_does_nothing(brain, conn):
    brain.model = StubModel(score=0.1)
    for i in range(300):
        db.insert_telemetry(conn, "robin-test", T - 600 + i * 2, telemetry(i))
    brain.cfg["reminders"] = []
    brain.tick(T)
    assert not any(c.startswith("ask") for c in brain.robot.sent)


def test_offline_robot_alerts_once_and_recovers(brain, conn):
    brain.cfg["reminders"] = []
    db.insert_telemetry(conn, "robin-test", T - 600, telemetry(1))
    brain.tick(T)
    brain.tick(T + 10)
    alerts = [m for m in brain.notifier.messages if m[0] == "alert"]
    assert len(alerts) == 1 and "offline" in alerts[0][1]
    db.insert_telemetry(conn, "robin-test", T + 20, telemetry(2))
    brain.tick(T + 21)
    assert brain.notifier.messages[-1][1] == "Robin is back online"


@pytest.mark.parametrize("hhmm,night", [("23:30", True), ("03:00", True), ("06:29", True),
                                        ("06:30", False), ("12:00", False), ("22:59", False)])
def test_night_window_wraps_midnight(brain, hhmm, night):
    h, m = map(int, hhmm.split(":"))
    assert brain.is_night(datetime(2026, 10, 1, h, m).timestamp()) is night


def test_demo_clock_offset_shifts_schedule(cfg, conn):
    cfg["reminders"] = [{"name": "night", "time": "03:00", "track": 8, "ask": False, "window_min": 30}]
    real_noon = datetime(2026, 10, 1, 12, 0).timestamp()
    offset = datetime(2026, 10, 1, 3, 1).timestamp() - real_noon
    b = Brain(cfg, conn, FakeRobot(), FakeNotifier(), clock_offset_s=offset)
    motion_at(conn, real_noon, 1)
    b.tick(real_noon + 1)
    assert b.robot.sent[-1] == "say 8 4000"


def test_brain_does_not_talk_to_an_offline_robot(brain, conn):
    brain.model = StubModel(score=-0.5)
    brain.cfg["reminders"] = []
    for i in range(300):
        db.insert_telemetry(conn, "robin-test", T - 600 + i * 2, telemetry(i))
    db.insert_status(conn, "robin-test", T - 1, "offline")   # Last Will arrived
    brain.tick(T)
    assert not any(c.startswith("ask") for c in brain.robot.sent)
    assert conn.execute("SELECT COUNT(*) FROM scores").fetchone()[0] == 0
