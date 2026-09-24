"""Ingestion component: MQTT stream -> validate -> SQLite. Plus the weather API poller.

Every message is checked before it is stored. Bad messages are not thrown away silently:
they go to the `rejects` table so you can count them in your tests.
"""
from __future__ import annotations

import json
import logging
import threading
import time

from . import db, weather
from .config import resolve
from .mqtt_link import connect, make_client

log = logging.getLogger(__name__)


def handle_message(conn, topic: str, payload: bytes, now: float | None = None) -> str:
    """Stores one MQTT message. Returns what happened (useful for tests and logging)."""
    now = time.time() if now is None else now
    parts = topic.split("/")
    if len(parts) != 3 or parts[0] != "robin":
        db.insert_reject(conn, now, topic, payload.decode(errors="replace"), "unexpected topic")
        return "rejected"
    _, device, kind = parts
    text = payload.decode(errors="replace")

    if kind == "status":
        db.insert_status(conn, device, now, text.strip())
        return "status"
    if kind not in ("telemetry", "event"):
        return "ignored"  # cmd / pong are not ours to store
    try:
        data = json.loads(text)
        if not isinstance(data, dict):
            raise db.ValidationError("not a JSON object")
        stored = (db.insert_telemetry if kind == "telemetry" else db.insert_event)(conn, device, now, data)
        return kind if stored else "duplicate"
    except (json.JSONDecodeError, db.ValidationError) as exc:
        db.insert_reject(conn, now, topic, text, str(exc))
        log.warning("rejected %s: %s", topic, exc)
        return "rejected"


def run(cfg: dict, stop: threading.Event | None = None) -> None:
    stop = stop or threading.Event()
    db_path = str(resolve(cfg, cfg["database"]))
    conn = db.connect(db_path)
    counts: dict[str, int] = {}

    def on_connect(client, userdata, flags, reason_code, properties):
        log.info("ingest connected (%s), subscribing to robin/+/#", reason_code)
        client.subscribe([("robin/+/telemetry", 0), ("robin/+/event", 1), ("robin/+/status", 1)])

    def on_message(client, userdata, msg):
        result = handle_message(conn, msg.topic, msg.payload)
        counts[result] = counts.get(result, 0) + 1
        if result == "event":
            log.info("event %s", msg.payload.decode(errors="replace"))
        elif result == "status":
            log.info("status %s: %s", msg.topic, msg.payload.decode(errors="replace"))

    client = make_client(cfg, "ingest")
    client.on_connect = on_connect
    client.on_message = on_message
    connect(client, cfg)
    weather.start_polling(cfg, db_path, stop)
    client.loop_start()
    log.info("ingest running, database %s", db_path)
    try:
        while not stop.wait(60):
            log.info("ingest last minute: %s", counts or "nothing received")
            counts.clear()
    finally:
        client.loop_stop()
        client.disconnect()
