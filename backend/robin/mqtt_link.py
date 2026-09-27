"""Small helper around paho-mqtt so every part of the backend connects the same way."""
from __future__ import annotations

import logging
import uuid

import paho.mqtt.client as mqtt

log = logging.getLogger(__name__)


def make_client(cfg: dict, role: str) -> mqtt.Client:
    client = mqtt.Client(
        mqtt.CallbackAPIVersion.VERSION2,
        client_id=f"robin-{role}-{uuid.uuid4().hex[:6]}",
    )
    if cfg["mqtt"].get("username"):
        client.username_pw_set(cfg["mqtt"]["username"], cfg["mqtt"].get("password") or None)
    client.reconnect_delay_set(min_delay=1, max_delay=30)
    return client


def connect(client: mqtt.Client, cfg: dict) -> None:
    host, port = cfg["mqtt"]["host"], int(cfg["mqtt"]["port"])
    log.info("connecting to MQTT broker %s:%s", host, port)
    client.connect(host, port, keepalive=30)


class RobotLink:
    """Sends plain-text commands to the robot on robin/<device>/cmd (QoS 1)."""

    def __init__(self, cfg: dict):
        self.topic = f"robin/{cfg['device_id']}/cmd"
        self.client = make_client(cfg, "brain")
        connect(self.client, cfg)
        self.client.loop_start()

    def send(self, text: str) -> None:
        log.info("-> robot: %s", text)
        self.client.publish(self.topic, text, qos=1)

    def close(self) -> None:
        self.client.loop_stop()
        self.client.disconnect()
