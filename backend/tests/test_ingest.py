import json

from conftest import telemetry
from robin import db
from robin.ingest import handle_message


def test_valid_telemetry_is_stored_once(conn):
    payload = json.dumps(telemetry(1)).encode()
    assert handle_message(conn, "robin/r1/telemetry", payload, now=1000.0) == "telemetry"
    assert handle_message(conn, "robin/r1/telemetry", payload, now=1001.0) == "duplicate"
    assert conn.execute("SELECT COUNT(*) FROM telemetry").fetchone()[0] == 1


def test_same_seq_after_reboot_is_a_new_message(conn):
    handle_message(conn, "robin/r1/telemetry", json.dumps(telemetry(0, boot=1)).encode(), now=1.0)
    handle_message(conn, "robin/r1/telemetry", json.dumps(telemetry(0, boot=2)).encode(), now=2.0)
    assert conn.execute("SELECT COUNT(*) FROM telemetry").fetchone()[0] == 2


def test_broken_json_goes_to_rejects(conn):
    assert handle_message(conn, "robin/r1/telemetry", b"{not json", now=1.0) == "rejected"
    row = conn.execute("SELECT topic, reason FROM rejects").fetchone()
    assert row["topic"] == "robin/r1/telemetry"


def test_missing_field_and_out_of_range_are_rejected(conn):
    bad = telemetry(1)
    del bad["light"]
    assert handle_message(conn, "robin/r1/telemetry", json.dumps(bad).encode(), now=1.0) == "rejected"
    assert handle_message(conn, "robin/r1/telemetry", json.dumps(telemetry(2, light=5000)).encode(), now=1.0) == "rejected"
    assert handle_message(conn, "robin/r1/telemetry", json.dumps(telemetry(3, pir=7)).encode(), now=1.0) == "rejected"
    assert conn.execute("SELECT COUNT(*) FROM rejects").fetchone()[0] == 3


def test_event_time_is_corrected_for_queue_delay(conn):
    event = {"boot": 1, "eseq": 4, "ms": 5000, "age_ms": 3000, "type": "button", "value": "yes"}
    assert handle_message(conn, "robin/r1/event", json.dumps(event).encode(), now=100.0) == "event"
    assert handle_message(conn, "robin/r1/event", json.dumps(event).encode(), now=101.0) == "duplicate"
    row = conn.execute("SELECT ts, ts_event, value FROM events").fetchone()
    assert row["ts"] == 100.0 and row["ts_event"] == 97.0 and row["value"] == "yes"


def test_status_and_unknown_topics(conn):
    assert handle_message(conn, "robin/r1/status", b"offline", now=5.0) == "status"
    assert db.latest_status(conn, "r1")["value"] == "offline"
    assert handle_message(conn, "robin/r1/cmd", b"say 3", now=5.0) == "ignored"
    assert handle_message(conn, "something/else", b"x", now=5.0) == "rejected"
