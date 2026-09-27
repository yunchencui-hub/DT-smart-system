"""Caregiver notifications via ntfy.sh (free push notifications, no account needed).

Install the ntfy app on the caregiver's phone and subscribe to the SAME secret topic as in config.yaml.
Anyone who knows the topic name can read it, so make it long and random, and never put real
health data in a prototype notification (see docs/02_design.md, ethics).
"""
from __future__ import annotations

import json
import logging

import requests

from . import db

log = logging.getLogger(__name__)
PRIORITY = {"info": "low", "warning": "default", "alert": "urgent"}
TAGS = {"info": "white_check_mark", "warning": "warning", "alert": "rotating_light"}


class Notifier:
    def __init__(self, cfg: dict, conn):
        self.topic = cfg["caregiver"].get("ntfy_topic") or ""
        self.server = cfg["caregiver"].get("ntfy_server", "https://ntfy.sh").rstrip("/")
        self.device = cfg["device_id"]
        self.conn = conn

    def send(self, level: str, title: str, message: str) -> bool:
        log.log(logging.WARNING if level == "alert" else logging.INFO, "[caregiver %s] %s: %s", level, title, message)
        db.log_action(self.conn, self.device, "notify", json.dumps({"level": level, "title": title, "message": message}))
        if not self.topic:
            return False
        try:
            response = requests.post(
                f"{self.server}/{self.topic}",
                data=message.encode("utf-8"),
                headers={"Title": title, "Priority": PRIORITY.get(level, "default"), "Tags": TAGS.get(level, "")},
                timeout=5,
            )
            response.raise_for_status()
            return True
        except requests.RequestException as exc:  # internet down: the alert is still in the database
            log.warning("ntfy failed: %s", exc)
            db.log_action(self.conn, self.device, "notify_failed", str(exc))
            return False
