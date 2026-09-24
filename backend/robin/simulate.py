"""A virtual Robin, for testing the whole pipeline BEFORE the hardware arrives (and for automated tests).

    python -m robin simulate                      # behaves like the real robot on MQTT (device sim-01)
    python -m robin simulate --backfill-days 7    # write 7 days of fake history straight into the database

While it runs, type + Enter:   y / n = press green / red     m = movement for 30 s
                               q = quiet (nobody moves) on/off   d = dark on/off   x = exit
The same controls can be sent to MQTT topic robin/sim-01/sim (for scripted tests).

WARNING: the assignment requires the model to be trained on YOUR OWN sensor data. Simulated data is
only for developing and testing the software. Simulated devices always start with "sim".
"""
from __future__ import annotations

import json
import logging
import math
import random
import sys
import threading
import time

from . import db
from .config import resolve
from .mqtt_link import connect, make_client

log = logging.getLogger(__name__)
PUBLISH_S = 2.0

# Probability that "grandma" is in the room, per hour of the day (a made-up but plausible routine)
ROUTINE = [0.02, 0.02, 0.03, 0.02, 0.02, 0.03, 0.15, 0.6, 0.7, 0.5, 0.4, 0.45,
           0.7, 0.55, 0.3, 0.4, 0.45, 0.5, 0.7, 0.65, 0.6, 0.55, 0.3, 0.08]


def sim_name(device: str) -> str:
    return device if device.startswith("sim") else f"sim-{device}"


class Person:
    """Two-state Markov chain (in the room / away) whose average follows ROUTINE."""

    def __init__(self, rng: random.Random):
        self.rng = rng
        self.present = False

    def step(self, hour: float) -> None:
        level = ROUTINE[int(hour) % 24]
        leave = PUBLISH_S / 300.0                                   # stays ~5 minutes on average
        enter = min(0.5, level * leave / max(1e-6, 1 - level))      # stationary probability = level
        if self.present:
            self.present = self.rng.random() > leave
        else:
            self.present = self.rng.random() < enter


def daylight_pct(hour: float) -> float:
    if 7 <= hour <= 19:
        return 5 + 55 * math.sin(math.pi * (hour - 7) / 12)
    return 2.0


def make_message(rng: random.Random, person: Person, hour: float, *, quiet=False, force_motion=False,
                 dark=False) -> dict:
    moving = force_motion or (person.present and not quiet and rng.random() < 0.5)
    high_ms = int(rng.uniform(800, 2000) // 100 * 100) if moving else 0
    edges = 1 if moving and (force_motion or rng.random() < 0.5) else 0
    light = 1.0 if dark else daylight_pct(hour)
    lamp_hours = hour >= 18 or hour < 7
    if not dark and person.present and lamp_hours:
        light += 35
    light = max(0.0, min(100.0, light + rng.gauss(0, 1.5)))
    return {"n": 20, "pir": 1 if moving else 0, "edges": edges, "high_ms": high_ms,
            "light": int(light * 10.23), "rssi": int(rng.gauss(-58, 4))}


def backfill(cfg: dict, device: str, days: float, seed: int = 1, loss: float = 0.005) -> int:
    """Writes `days` of history ending now, as if the robot had been running at home."""
    conn = db.connect(resolve(cfg, cfg["database"]))
    rng = random.Random(seed)
    person = Person(rng)
    end = time.time()
    start = end - days * 86400
    boot, seq, rows = rng.randint(1, 999999), 0, []
    t = start
    while t < end:
        lt = time.localtime(t)
        hour = lt.tm_hour + lt.tm_min / 60
        person.step(hour)
        m = make_message(rng, person, hour)
        if rng.random() >= loss:  # simulate a few lost WiFi messages
            rows.append((device, t, boot, seq, 120000 + int((t - start) * 1000), m["n"], m["pir"], m["edges"],
                         m["high_ms"], m["light"], m["rssi"]))
        seq += 1
        t += PUBLISH_S
    conn.executemany(
        "INSERT OR IGNORE INTO telemetry (device, ts, boot, seq, dev_ms, n, pir, edges, high_ms, light, rssi)"
        " VALUES (?,?,?,?,?,?,?,?,?,?,?)", rows)
    conn.commit()
    print(f"Backfilled {len(rows)} messages ({days} days) for device {device}")
    return len(rows)


class VirtualRobot:
    def __init__(self, cfg: dict, device: str, tracks: dict[int, str], auto_answer: str | None = None):
        self.cfg, self.device, self.tracks, self.auto_answer = cfg, device, tracks, auto_answer
        self.rng = random.Random()
        self.person = Person(self.rng)
        self.boot = self.rng.randint(1, 999999)
        self.seq = self.eseq = 0
        self.started = time.time()
        self.quiet = self.dark = False
        self.motion_until = 0.0
        self.client = make_client(cfg, f"sim-{device}")
        self.base = f"robin/{device}"
        self.client.will_set(f"{self.base}/status", "offline", qos=1, retain=True)
        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message

    def _on_connect(self, client, userdata, flags, reason_code, properties):
        client.subscribe([(f"{self.base}/cmd", 1), (f"{self.base}/sim", 0)])
        client.publish(f"{self.base}/status", "online", qos=1, retain=True)
        print(f"[sim] {self.device} online (type y/n/m/q/d/x + Enter)")

    def _on_message(self, client, userdata, msg):
        text = msg.payload.decode(errors="replace").strip()
        if msg.topic.endswith("/sim"):
            self.control(text)
            return
        parts = text.split()
        if not parts:
            return
        if parts[0] in ("say", "ask") and len(parts) > 1:
            track = int(parts[1])
            print(f"[sim] SPEAKS #{track}: \"{self.tracks.get(track, '?')}\"")
            if parts[0] == "ask" and self.auto_answer:
                delay = float(parts[2]) / 1000 + 1 if len(parts) > 2 else 2
                threading.Timer(delay, self.press, args=(self.auto_answer,)).start()
        elif parts[0] == "ping" and len(parts) > 1:
            client.publish(f"{self.base}/pong", parts[1])
        else:
            print(f"[sim] command: {text}")

    def control(self, text: str) -> None:
        key = text.strip().lower()
        if key in ("y", "yes"):
            self.press("yes")
        elif key in ("n", "no"):
            self.press("no")
        elif key in ("m", "motion"):
            self.motion_until = time.time() + 30
            print("[sim] movement for 30 s")
        elif key.startswith("q") or key.startswith("quiet"):
            self.quiet = "off" not in key if " " in key else not self.quiet
            print(f"[sim] quiet={self.quiet}")
        elif key.startswith("d") or key.startswith("dark"):
            self.dark = "off" not in key if " " in key else not self.dark
            print(f"[sim] dark={self.dark}")

    def press(self, value: str) -> None:
        self.eseq += 1
        event = {"boot": self.boot, "eseq": self.eseq, "ms": self.uptime_ms(), "age_ms": 0,
                 "type": "button", "value": value}
        self.client.publish(f"{self.base}/event", json.dumps(event), qos=1)
        print(f"[sim] button {value}")

    def uptime_ms(self) -> int:
        return int((time.time() - self.started) * 1000) + 120000  # pretend PIR warm-up is over

    def run(self, stop: threading.Event) -> None:
        connect(self.client, self.cfg)
        self.client.loop_start()
        threading.Thread(target=self._keyboard, args=(stop,), daemon=True).start()
        try:
            while not stop.wait(PUBLISH_S):
                lt = time.localtime()
                hour = lt.tm_hour + lt.tm_min / 60
                self.person.step(hour)
                m = make_message(self.rng, self.person, hour, quiet=self.quiet,
                                 force_motion=time.time() < self.motion_until, dark=self.dark)
                m.update({"boot": self.boot, "seq": self.seq, "ms": self.uptime_ms()})
                self.seq += 1
                self.client.publish(f"{self.base}/telemetry", json.dumps(m), qos=0)
        finally:
            self.client.publish(f"{self.base}/status", "offline", qos=1, retain=True)
            self.client.loop_stop()
            self.client.disconnect()

    def _keyboard(self, stop: threading.Event) -> None:
        if not sys.stdin or not sys.stdin.isatty():
            return
        for line in sys.stdin:
            if line.strip().lower() == "x":
                stop.set()
                return
            self.control(line)


def load_track_texts(cfg: dict) -> dict[int, str]:
    import yaml

    path = resolve(cfg, "../audio/tracks.yaml")
    try:
        tracks = yaml.safe_load(path.read_text(encoding="utf-8"))["tracks"]
        return {int(k): v["en"] for k, v in tracks.items()}
    except (OSError, KeyError, TypeError):
        return {}


def run(cfg: dict, device: str, auto_answer: str | None = None, stop: threading.Event | None = None) -> None:
    stop = stop or threading.Event()
    VirtualRobot(cfg, sim_name(device), load_track_texts(cfg), auto_answer).run(stop)
