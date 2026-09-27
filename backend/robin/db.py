"""Storage component: one SQLite file with a few simple tables.

Why SQLite? It is a single file, needs no server, survives power cuts (WAL journal), and easily
handles our load (one message every 2 s = 43,200 rows/day). A time-series DB (InfluxDB) or a
cloud DB would add setup and privacy questions without a real benefit at this scale.
"""
from __future__ import annotations

import json
import sqlite3
import time
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS telemetry (
    id       INTEGER PRIMARY KEY,
    device   TEXT    NOT NULL,
    ts       REAL    NOT NULL,          -- unix time (s) when the backend received it
    boot     INTEGER NOT NULL,          -- random id per power-up of the robot
    seq      INTEGER NOT NULL,          -- message counter, gaps = lost messages
    dev_ms   INTEGER NOT NULL,          -- robot uptime in ms
    n        INTEGER NOT NULL,          -- number of sensor samples in this message
    pir      INTEGER NOT NULL,          -- PIR state at send time (0/1)
    edges    INTEGER NOT NULL,          -- new movements detected in this interval
    high_ms  INTEGER NOT NULL,          -- ms the PIR was HIGH in this interval
    light    INTEGER NOT NULL,          -- average raw light level 0..1023
    rssi     INTEGER,                   -- WiFi signal strength in dBm
    UNIQUE (device, boot, seq)          -- QoS/duplicates are silently ignored
);
CREATE INDEX IF NOT EXISTS idx_telemetry_device_ts ON telemetry (device, ts);

CREATE TABLE IF NOT EXISTS events (
    id       INTEGER PRIMARY KEY,
    device   TEXT    NOT NULL,
    ts       REAL    NOT NULL,          -- received
    ts_event REAL    NOT NULL,          -- when it really happened (ts - age_ms)
    boot     INTEGER NOT NULL,
    eseq     INTEGER NOT NULL,
    type     TEXT    NOT NULL,          -- button | boot
    value    TEXT,
    UNIQUE (device, boot, eseq)         -- QoS 1 can deliver twice; store once
);
CREATE INDEX IF NOT EXISTS idx_events_device_ts ON events (device, ts_event);

CREATE TABLE IF NOT EXISTS status (
    id INTEGER PRIMARY KEY, device TEXT NOT NULL, ts REAL NOT NULL, value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS weather (
    id INTEGER PRIMARY KEY, ts REAL NOT NULL, temp_c REAL, temp_max_c REAL, precip_mm REAL, raw TEXT
);
CREATE TABLE IF NOT EXISTS actions (
    id INTEGER PRIMARY KEY, ts REAL NOT NULL, device TEXT, kind TEXT NOT NULL, detail TEXT
);
CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY, ts REAL NOT NULL, device TEXT NOT NULL, window_min REAL,
    score REAL, inactive INTEGER, anomaly INTEGER, features TEXT
);
CREATE TABLE IF NOT EXISTS rejects (
    id INTEGER PRIMARY KEY, ts REAL NOT NULL, topic TEXT, payload TEXT, reason TEXT
);
"""

TELEMETRY_FIELDS = ("boot", "seq", "ms", "n", "pir", "edges", "high_ms", "light")


def connect(path: str | Path) -> sqlite3.Connection:
    if str(path) != ":memory:":
        Path(path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path), timeout=10, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")   # readers (brain) never block the writer (ingest)
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.executescript(SCHEMA)
    return conn


class ValidationError(ValueError):
    pass


def validate_telemetry(p: dict) -> None:
    missing = [k for k in TELEMETRY_FIELDS if k not in p]
    if missing:
        raise ValidationError(f"missing fields {missing}")
    for k in TELEMETRY_FIELDS:
        if not isinstance(p[k], int) or isinstance(p[k], bool):
            raise ValidationError(f"{k} is not an integer")
    if p["pir"] not in (0, 1):
        raise ValidationError("pir must be 0 or 1")
    if not 0 <= p["light"] <= 1023:
        raise ValidationError("light out of range 0..1023")
    if p["n"] <= 0 or p["edges"] < 0 or p["high_ms"] < 0:
        raise ValidationError("negative or zero counters")


def insert_telemetry(conn: sqlite3.Connection, device: str, ts: float, p: dict) -> bool:
    """Returns True when stored, False when it was a duplicate."""
    validate_telemetry(p)
    cur = conn.execute(
        "INSERT OR IGNORE INTO telemetry (device, ts, boot, seq, dev_ms, n, pir, edges, high_ms, light, rssi)"
        " VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        (device, ts, p["boot"], p["seq"], p["ms"], p["n"], p["pir"], p["edges"], p["high_ms"],
         p["light"], p.get("rssi")),
    )
    conn.commit()
    return cur.rowcount == 1


def insert_event(conn: sqlite3.Connection, device: str, ts: float, p: dict) -> bool:
    for k in ("boot", "eseq", "type"):
        if k not in p:
            raise ValidationError(f"missing field {k}")
    ts_event = ts - max(0, int(p.get("age_ms", 0))) / 1000.0
    cur = conn.execute(
        "INSERT OR IGNORE INTO events (device, ts, ts_event, boot, eseq, type, value) VALUES (?,?,?,?,?,?,?)",
        (device, ts, ts_event, p["boot"], p["eseq"], str(p["type"]), str(p.get("value", ""))),
    )
    conn.commit()
    return cur.rowcount == 1


def insert_status(conn: sqlite3.Connection, device: str, ts: float, value: str) -> None:
    conn.execute("INSERT INTO status (device, ts, value) VALUES (?,?,?)", (device, ts, value))
    conn.commit()


def insert_reject(conn: sqlite3.Connection, ts: float, topic: str, payload: str, reason: str) -> None:
    conn.execute("INSERT INTO rejects (ts, topic, payload, reason) VALUES (?,?,?,?)",
                 (ts, topic, payload[:500], reason))
    conn.commit()


def insert_weather(conn: sqlite3.Connection, ts: float, temp_c, temp_max_c, precip_mm, raw: dict) -> None:
    conn.execute("INSERT INTO weather (ts, temp_c, temp_max_c, precip_mm, raw) VALUES (?,?,?,?,?)",
                 (ts, temp_c, temp_max_c, precip_mm, json.dumps(raw)))
    conn.commit()


def log_action(conn: sqlite3.Connection, device: str, kind: str, detail: str, ts: float | None = None) -> None:
    conn.execute("INSERT INTO actions (ts, device, kind, detail) VALUES (?,?,?,?)",
                 (ts if ts is not None else time.time(), device, kind, detail))
    conn.commit()


def insert_score(conn, device: str, ts: float, window_min: float, score: float,
                 inactive: bool, anomaly: bool, features: dict) -> None:
    conn.execute(
        "INSERT INTO scores (ts, device, window_min, score, inactive, anomaly, features)"
        " VALUES (?,?,?,?,?,?,?)",
        (ts, device, window_min, score, int(inactive), int(anomaly), json.dumps(features)),
    )
    conn.commit()


# ---------- small queries used by the brain ----------

def latest_status(conn, device: str):
    return conn.execute("SELECT ts, value FROM status WHERE device=? ORDER BY ts DESC LIMIT 1",
                        (device,)).fetchone()


def last_telemetry_ts(conn, device: str) -> float | None:
    row = conn.execute("SELECT MAX(ts) AS t FROM telemetry WHERE device=?", (device,)).fetchone()
    return row["t"] if row else None


def last_motion_ts(conn, device: str) -> float | None:
    """Last real movement (rows from the PIR warm-up minute after a reboot are ignored)."""
    row = conn.execute(
        "SELECT MAX(ts) AS t FROM telemetry WHERE device=? AND (pir=1 OR edges>0) AND dev_ms>=60000",
        (device,),
    ).fetchone()
    return row["t"] if row else None


def button_events_since(conn, device: str, since_ts: float) -> list[sqlite3.Row]:
    return conn.execute(
        "SELECT ts_event, value FROM events WHERE device=? AND type='button' AND ts_event>=?"
        " ORDER BY ts_event", (device, since_ts),
    ).fetchall()


def latest_weather(conn):
    return conn.execute("SELECT * FROM weather ORDER BY ts DESC LIMIT 1").fetchone()
