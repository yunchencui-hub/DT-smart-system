"""Measurement tools for the test plan.

    python -m robin latency --count 50     round-trip time laptop -> robot -> laptop over MQTT
    python -m robin report --hours 24      data completeness, message loss, regularity, rejects
    python -m robin cmd "say 3"            send any command to the robot by hand
"""
from __future__ import annotations

import csv
import statistics
import threading
import time
import uuid

from . import db
from .config import resolve, topic
from .mqtt_link import connect, make_client
from .processing import load_telemetry, quality_report


def latency(cfg: dict, count: int = 50, interval: float = 0.5, timeout: float = 3.0) -> dict:
    sent: dict[str, float] = {}
    rtt_ms: dict[str, float] = {}
    done = threading.Event()

    def on_connect(client, userdata, flags, reason_code, properties):
        client.subscribe(topic(cfg, "pong"), qos=0)
        done.set()

    def on_message(client, userdata, msg):
        token = msg.payload.decode(errors="replace").strip()
        if token in sent and token not in rtt_ms:
            rtt_ms[token] = (time.perf_counter() - sent[token]) * 1000

    client = make_client(cfg, "latency")
    client.on_connect, client.on_message = on_connect, on_message
    connect(client, cfg)
    client.loop_start()
    done.wait(5)
    for i in range(count):
        token = f"{i}-{uuid.uuid4().hex[:6]}"
        sent[token] = time.perf_counter()
        client.publish(topic(cfg, "cmd"), f"ping {token}", qos=1)
        time.sleep(interval)
    time.sleep(timeout)
    client.loop_stop()
    client.disconnect()

    values = [rtt_ms[t] for t in sent if t in rtt_ms]
    result = {"sent": count, "received": len(values), "lost": count - len(values)}
    if values:
        values_sorted = sorted(values)
        result.update({
            "rtt_min_ms": round(values_sorted[0], 1),
            "rtt_median_ms": round(statistics.median(values), 1),
            "rtt_p95_ms": round(values_sorted[max(0, int(0.95 * len(values)) - 1)], 1),
            "rtt_max_ms": round(values_sorted[-1], 1),
            "one_way_estimate_ms": round(statistics.median(values) / 2, 1),
        })
    out_dir = resolve(cfg, "reports")
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"latency_{time.strftime('%Y%m%d_%H%M%S')}.csv"
    with path.open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["token", "rtt_ms"])
        for token in sent:
            writer.writerow([token, round(rtt_ms[token], 2) if token in rtt_ms else ""])
    result["csv"] = str(path)
    for k, v in result.items():
        print(f"{k:>22}: {v}")
    return result


def report(cfg: dict, hours: float = 24) -> dict:
    conn = db.connect(resolve(cfg, cfg["database"]))
    since = time.time() - hours * 3600
    raw = load_telemetry(conn, cfg["device_id"], since)
    result = quality_report(raw)
    device = cfg["device_id"]

    def count(sql: str, *params) -> int:
        return conn.execute(sql, params).fetchone()[0]

    result["events"] = count("SELECT COUNT(*) FROM events WHERE device=? AND ts>=?", device, since)
    result["rejected_messages"] = count("SELECT COUNT(*) FROM rejects WHERE ts>=?", since)
    result["offline_status_msgs"] = count(
        "SELECT COUNT(*) FROM status WHERE device=? AND value='offline' AND ts>=?", device, since)
    result["weather_rows"] = count("SELECT COUNT(*) FROM weather WHERE ts>=?", since)
    result["anomaly_flags"] = count(
        "SELECT COUNT(*) FROM scores WHERE device=? AND anomaly=1 AND ts>=?", device, since)
    print(f"Data report for {cfg['device_id']}, last {hours} h")
    for k, v in result.items():
        print(f"{k:>22}: {v}")
    return result


def send_command(cfg: dict, text: str) -> None:
    client = make_client(cfg, "cmd")
    connect(client, cfg)
    client.loop_start()
    info = client.publish(topic(cfg, "cmd"), text, qos=1)
    info.wait_for_publish(5)
    client.loop_stop()
    client.disconnect()
    print(f"sent to {topic(cfg, 'cmd')}: {text}")
