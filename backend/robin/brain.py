"""Autonomous action component ("the brain"). Every second it looks at the database and decides:

  1. Reminders from the caregiver's schedule, spoken only when someone is actually in the room
     (Tessa speaks at a fixed time, even to an empty room; Robin waits for the PIR).
  2. Check-ins: every minute the model scores the last window. Unusual -> Robin asks "are you alright?"
  3. Answers: green = fine; red, or no answer after one repeat -> the caregiver gets a push alert.
  4. Health: robot silent/offline too long -> caregiver alert (a system should fail loudly, not quietly).
  5. Context: a hot day (weather API) -> an extra water reminder.
"""
from __future__ import annotations

import json
import logging
import math
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path

from . import db
from .config import resolve
from .model import AnomalyModel
from .processing import clean, features_for_window, load_telemetry

log = logging.getLogger(__name__)

TRACK_THANKS, TRACK_CALLING_HELP, TRACK_REPEAT, TRACK_MAYBE_LATER = 9, 10, 11, 13
TRACK_CHECKIN_DAY, TRACK_CHECKIN_NIGHT, TRACK_HOT_DAY = 7, 8, 5


@dataclass
class Conversation:
    name: str
    track: int
    ask: bool
    alert_on_no: bool
    require_presence: bool
    deadline: float                  # stop waiting for someone to show up at this time
    kind: str = "reminder"           # reminder | checkin
    detail: str = ""
    state: str = "waiting"           # waiting -> asked (-> repeat -> asked) -> done
    asked_at: float = 0.0
    repeats_left: int = 1
    next_at: float = 0.0


def _parse_hhmm(text: str) -> tuple[int, int]:
    hours, minutes = text.split(":")
    return int(hours), int(minutes)


class Brain:
    def __init__(self, cfg: dict, conn, robot, notifier, model: AnomalyModel | None = None,
                 clock_offset_s: float = 0.0):
        self.cfg, self.conn, self.robot, self.notifier, self.model = cfg, conn, robot, notifier, model
        self.device = cfg["device_id"]
        self.offset = clock_offset_s
        self.queue: list[Conversation] = []
        self.active: Conversation | None = None
        self.fired: set[tuple[str, str]] = set()
        self.extra_reminders: list[dict] = []
        self.last_anomaly_check = 0.0
        self.last_checkin = -math.inf
        self.offline_alerted = False
        self.night: bool | None = None
        self.face_after: float | None = None     # restore the resting face after the last sentence
        self.model_path = resolve(cfg, cfg["anomaly"]["model_path"])
        self.model_mtime = self.model_path.stat().st_mtime if self.model_path.exists() else None
        self.durations = self._load_durations()

    # ------------------------------------------------------------------ helpers
    def _load_durations(self) -> dict[int, int]:
        path = resolve(self.cfg, self.cfg["audio"]["durations_file"])
        try:
            return {int(k): int(v) for k, v in json.loads(Path(path).read_text()).items()}
        except (OSError, ValueError):
            log.warning("no durations file at %s, assuming 4 s per track", path)
            return {}

    def duration_ms(self, track: int) -> int:
        return self.durations.get(track, 4000)

    def local(self, now: float) -> datetime:
        """Local clock. In demo mode it can be shifted (e.g. pretend it is 03:00)."""
        return datetime.fromtimestamp(now + self.offset)

    def is_night(self, now: float) -> bool:
        t = self.local(now)
        start, end = _parse_hhmm(self.cfg["anomaly"]["night_start"]), _parse_hhmm(self.cfg["anomaly"]["night_end"])
        minutes = t.hour * 60 + t.minute
        s, e = start[0] * 60 + start[1], end[0] * 60 + end[1]
        return minutes >= s or minutes < e if s > e else s <= minutes < e

    def robot_online(self, now: float) -> bool:
        """Only talk to (and judge data from) a robot that is really there."""
        status = db.latest_status(self.conn, self.device)
        last = db.last_telemetry_ts(self.conn, self.device)
        return (status is None or status["value"] != "offline") and last is not None and now - last <= 60

    def present(self, now: float) -> bool:
        last = db.last_motion_ts(self.conn, self.device)
        return last is not None and now - last <= self.cfg["presence"]["recent_motion_s"]

    def say(self, track: int, ask: bool = False) -> None:
        self.robot.send(f"{'ask' if ask else 'say'} {track} {self.duration_ms(track)}")

    def log(self, kind: str, detail: dict, now: float) -> None:
        db.log_action(self.conn, self.device, kind, json.dumps(detail), ts=now)

    # ------------------------------------------------------------------ main loop
    def start(self, now: float) -> None:
        self.robot.send(f"vol {int(self.cfg['audio']['volume'])}")
        self.night = self.is_night(now)
        self.robot.send("face sleep" if self.night else "face happy")
        self.log("brain_start", {"model": self.model is not None, "clock_offset_s": self.offset}, now)

    def tick(self, now: float) -> None:
        self._health(now)
        self._weather(now)
        self._schedule(now)
        self._anomaly(now)
        self._converse(now)
        self._faces(now)

    # ------------------------------------------------------------------ 1. reminders
    def _schedule(self, now: float) -> None:
        local = self.local(now)
        for r in list(self.cfg["reminders"]) + self.extra_reminders:
            h, m = _parse_hhmm(r["time"])
            due = local.replace(hour=h, minute=m, second=0, microsecond=0)
            end = due + timedelta(minutes=r.get("window_min", 60))
            key = (local.strftime("%Y-%m-%d"), r["name"])
            if due <= local < end and key not in self.fired:
                self.fired.add(key)
                self.queue.append(Conversation(
                    name=r["name"], track=int(r["track"]), ask=bool(r.get("ask", False)),
                    alert_on_no=bool(r.get("alert_on_no", False)), require_presence=True,
                    deadline=now + (end - local).total_seconds(),
                    repeats_left=int(self.cfg["answers"]["repeats"])))
                self.log("reminder_due", {"name": r["name"]}, now)

    # ------------------------------------------------------------------ 5. weather context
    def _weather(self, now: float) -> None:
        row = db.latest_weather(self.conn)
        today = self.local(now).strftime("%Y-%m-%d")
        if row is None or row["temp_max_c"] is None or ("weather", today) in self.fired:
            return
        if time.strftime("%Y-%m-%d", time.localtime(row["ts"] + self.offset)) != today:
            return  # stale forecast
        self.fired.add(("weather", today))
        if row["temp_max_c"] >= self.cfg["weather"]["hot_day_c"]:
            self.extra_reminders.append({"name": "hot_day", "time": self.cfg["weather"]["hot_day_reminder_time"],
                                         "track": TRACK_HOT_DAY, "ask": False, "window_min": 120})
            self.log("hot_day", {"temp_max_c": row["temp_max_c"]}, now)

    # ------------------------------------------------------------------ 2. anomaly check-ins
    def _anomaly(self, now: float) -> None:
        a = self.cfg["anomaly"]
        if now - self.last_anomaly_check < a["check_every_s"]:
            return
        self.last_anomaly_check = now
        self._reload_model_if_retrained()
        if self.model is None or not self.robot_online(now):
            return
        window_min = a["window_min"]
        rows = clean(load_telemetry(self.conn, self.device, now - window_min * 60 - 5, now))
        feats = features_for_window(rows, now, window_min, db.last_motion_ts(self.conn, self.device),
                                    clock_offset_s=self.offset)
        if feats is None:
            return  # not enough data (robot offline or just booted); the health check covers that
        row = feats.iloc[0]
        score = float(self.model.score(feats)[0])
        inactive = bool(self.model.inactive(feats)[0])
        anomaly = score < 0 or inactive
        features = {k: round(float(row[k]), 4) for k in ("motion_ratio", "motion_rate", "light", "quiet_min", "hour")}
        db.insert_score(self.conn, self.device, now, window_min, score, inactive, anomaly, features)
        log.info("check %02d:%02d  score %+.3f%s  movement %.0f%%  light %.0f%%  quiet %.0f min",
                 self.local(now).hour, self.local(now).minute, score, "  INACTIVE" if inactive else "",
                 row["motion_ratio"] * 100, row["light"], row["quiet_min"])
        if not anomaly:
            return
        busy = self.active is not None and self.active.kind == "checkin"
        if busy or now - self.last_checkin < a["cooldown_min"] * 60:
            return
        self.last_checkin = now
        night = self.is_night(now)
        explanation = self.model.explain(row)
        self.log("anomaly", {"score": round(score, 3), "inactive": inactive, "why": explanation}, now)
        self.queue.insert(0, Conversation(
            name="night check-in" if night else "check-in", kind="checkin",
            track=TRACK_CHECKIN_NIGHT if night else TRACK_CHECKIN_DAY, ask=True, alert_on_no=True,
            require_presence=False, deadline=now + 600, detail=explanation,
            repeats_left=int(self.cfg["answers"]["repeats"])))

    def _reload_model_if_retrained(self) -> None:
        if not self.model_path.exists():
            return
        mtime = self.model_path.stat().st_mtime
        if mtime != self.model_mtime:
            self.model = AnomalyModel.load(self.model_path)
            self.model_mtime = mtime
            log.info("loaded model %s (%s)", self.model_path, self.model.meta)

    # ------------------------------------------------------------------ 3. conversations
    def _converse(self, now: float) -> None:
        if self.active is None and self.queue:
            self.active = self.queue.pop(0)
        c = self.active
        if c is None:
            return
        if not self.robot_online(now):   # pause; the health check already alerts the caregiver
            if c.state == "waiting" and now > c.deadline:
                self.log("conversation", {"name": c.name, "kind": c.kind, "outcome": "robot_offline"}, now)
                self.active = None
            return
        if c.state == "waiting":
            if not c.require_presence or self.present(now):
                self._ask(c, now)
            elif now > c.deadline:
                self._finish(c, now, "missed", "warning" if c.alert_on_no else "info",
                             f"Nobody walked past Robin during the '{c.name}' reminder window.")
        elif c.state == "asked":
            answers = db.button_events_since(self.conn, self.device, c.asked_at)
            if answers:
                self._answered(c, now, answers[0]["value"])
            elif now - c.asked_at > self.cfg["answers"]["timeout_s"]:
                if c.repeats_left > 0:
                    c.repeats_left -= 1
                    c.state = "repeat"
                    c.next_at = now + self.duration_ms(TRACK_REPEAT) / 1000 + 0.5
                    self.say(TRACK_REPEAT)
                else:
                    level = "alert" if c.alert_on_no else "info"
                    self._finish(c, now, "no_answer", level, f"No answer to '{c.name}'. {c.detail}".strip())
        elif c.state == "repeat" and now >= c.next_at:
            self._ask(c, now)

    def _ask(self, c: Conversation, now: float) -> None:
        self.say(c.track, ask=c.ask)
        if c.ask:
            c.state, c.asked_at = "asked", now
            self.log("asked", {"name": c.name, "track": c.track}, now)
        else:
            self._finish(c, now, "delivered", None, f"'{c.name}' was said while someone was present.")

    def _answered(self, c: Conversation, now: float, value: str) -> None:
        if value == "yes":
            self.say(TRACK_THANKS)
            self._finish(c, now, "yes", "info", f"'{c.name}': answered YES.", after_track=TRACK_THANKS)
        elif c.alert_on_no:
            self.say(TRACK_CALLING_HELP)
            self._finish(c, now, "no", "alert", f"'{c.name}': answered NO. {c.detail}".strip(),
                         after_track=TRACK_CALLING_HELP)
        else:
            self.say(TRACK_MAYBE_LATER)
            self._finish(c, now, "no", "info", f"'{c.name}': answered no (not urgent).",
                         after_track=TRACK_MAYBE_LATER)

    def _finish(self, c: Conversation, now: float, outcome: str, level: str | None, message: str,
                after_track: int | None = None) -> None:
        self.log("conversation", {"name": c.name, "kind": c.kind, "outcome": outcome}, now)
        if level:
            title = f"Robin: {c.name} - {outcome.replace('_', ' ')}"
            self.notifier.send(level, title, message)
        self.active = None
        delay = self.duration_ms(after_track) / 1000 + 1 if after_track else 1
        self.face_after = now + delay

    # ------------------------------------------------------------------ 4. health
    def _health(self, now: float) -> None:
        limit = self.cfg["offline_alert_min"] * 60
        last = db.last_telemetry_ts(self.conn, self.device)
        status = db.latest_status(self.conn, self.device)
        silent = last is not None and now - last > limit
        said_offline = status is not None and status["value"] == "offline" and now - status["ts"] > limit
        if (silent or said_offline) and not self.offline_alerted:
            self.offline_alerted = True
            minutes = (now - last) / 60 if last else self.cfg["offline_alert_min"]
            self.notifier.send("alert", "Robin is offline",
                               f"No data from Robin for {minutes:.0f} minutes. Check power and WiFi.")
        elif self.offline_alerted and last is not None and now - last < 30:
            self.offline_alerted = False
            self.notifier.send("info", "Robin is back online", "Data is flowing again.")

    # ------------------------------------------------------------------ faces
    def _faces(self, now: float) -> None:
        """Resting face: sleepy at night, happy by day. Never sent while Robin is still talking,
        because a face command would cut off the talking animation on the robot."""
        if self.active is not None:
            return
        night = self.is_night(now)
        if self.face_after is not None:
            if now >= self.face_after:
                self.face_after = None
                self.night = night
                self.robot.send("face sleep" if night else "face happy")
            return
        if self.night is None:
            self.night = night            # start() already showed the right face
        elif night != self.night:
            self.night = night
            self.robot.send("face sleep" if night else "face happy")


def run(cfg: dict, clock_offset_s: float = 0.0, stop: threading.Event | None = None) -> None:
    from .mqtt_link import RobotLink
    from .notify import Notifier

    stop = stop or threading.Event()
    conn = db.connect(resolve(cfg, cfg["database"]))
    model_path = resolve(cfg, cfg["anomaly"]["model_path"])
    model = AnomalyModel.load(model_path) if model_path.exists() else None
    if model is None:
        log.warning("No trained model at %s yet: reminders work, anomaly check-ins are off. "
                    "Collect data, then run `python -m robin train`.", model_path)
    else:
        log.info("model loaded: %s", model.meta)
    robot = RobotLink(cfg)
    brain = Brain(cfg, conn, robot, Notifier(cfg, conn), model, clock_offset_s)
    time.sleep(1)  # let the MQTT connection settle
    brain.start(time.time())
    if clock_offset_s:
        log.info("DEMO CLOCK: brain thinks it is %s", brain.local(time.time()).strftime("%H:%M"))
    try:
        while not stop.wait(1.0):
            brain.tick(time.time())
    finally:
        robot.close()
