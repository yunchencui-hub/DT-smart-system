import socket
import threading

import check_setup as cs
from conftest import telemetry
from robin import db

EXAMPLE = cs.parse_secrets((cs.FIRMWARE / "arduino_secrets.example.h").read_text(encoding="utf-8"))


def secrets(**changes):
    s = dict(EXAMPLE)
    s.update({f"SECRET_{k}": v for k, v in changes.items()})
    return s


def statuses(rows):
    return [(status, text) for status, text, *_ in rows]


def test_parse_secrets_reads_strings_numbers_and_skips_comments():
    s = cs.parse_secrets('#define SECRET_WIFI_SSID  ""\n// #define SECRET_WIFI_PASS "x"\n'
                         '#define SECRET_MQTT_PORT  1883\n#define SECRET_DEVICE_ID "robin-01"  // id\n')
    assert s == {"SECRET_WIFI_SSID": "", "SECRET_MQTT_PORT": "1883", "SECRET_DEVICE_ID": "robin-01"}
    assert EXAMPLE["SECRET_WIFI_SSID"] and EXAMPLE["SECRET_MQTT_HOST"]


def test_assess_secrets_offline_mode_is_fine():
    rows = statuses(cs.assess_secrets(secrets(WIFI_SSID=""), EXAMPLE, "robin-01", ["192.168.1.5"]))
    assert "FAIL" not in [s for s, _ in rows] and "WARN" not in [s for s, _ in rows]


def test_assess_secrets_catches_newbie_mistakes():
    ip = ["192.168.43.10"]
    placeholder = statuses(cs.assess_secrets(secrets(), EXAMPLE, "robin-01", ip))
    assert ("WARN", "WiFi name is still the example's placeholder") in placeholder
    eduroam = statuses(cs.assess_secrets(secrets(WIFI_SSID="eduroam"), EXAMPLE, "robin-01", ip))
    assert any(s == "FAIL" and "eduroam" in t for s, t in eduroam)
    local = statuses(cs.assess_secrets(secrets(WIFI_SSID="Hotspot", MQTT_HOST="localhost"), EXAMPLE, "robin-01", ip))
    assert any(s == "FAIL" and "localhost" in t for s, t in local)
    wrong_ip = statuses(cs.assess_secrets(secrets(WIFI_SSID="Hotspot", MQTT_HOST="10.0.0.9"), EXAMPLE, "robin-01", ip))
    assert any(s == "WARN" and "not this laptop's IP" in t for s, t in wrong_ip)
    other_id = statuses(cs.assess_secrets(secrets(WIFI_SSID="", DEVICE_ID="robin-02"), EXAMPLE, "robin-01", ip))
    assert any(s == "FAIL" and "robin-02" in t for s, t in other_id)


def test_assess_secrets_good_online_setup():
    rows = cs.assess_secrets(secrets(WIFI_SSID="Hotspot", WIFI_PASS="long-pass", MQTT_HOST="192.168.43.10"),
                             EXAMPLE, "robin-01", ["192.168.43.10"])
    assert [s for s, *_ in rows] == ["OK", "OK", "OK"]


def test_versions_compare_against_requirements():
    minimums = cs.requirement_minimums(cs.BACKEND / "requirements.txt")
    assert minimums["paho-mqtt"] == "2.0"
    assert cs.version_tuple("1.6.1") < cs.version_tuple(minimums["paho-mqtt"]) <= cs.version_tuple("2.1.0")
    assert cs.version_tuple("1.3rc1") == (1, 3)


def fake_broker(retained):
    """One-shot MQTT broker: CONNACK, SUBACK, then the retained messages. Returns its port."""
    server = socket.socket()
    server.bind(("127.0.0.1", 0))
    server.listen(1)

    def serve():
        conn, _ = server.accept()
        with conn, server:
            cs.read_packet(conn)                                 # CONNECT
            conn.sendall(bytes([0x20, 2, 0, 0]))                 # CONNACK, accepted
            _, sub = cs.read_packet(conn)                        # SUBSCRIBE
            conn.sendall(bytes([0x90, 3]) + sub[:2] + b"\x00")   # SUBACK
            for topic, payload, qos in retained:
                body = cs._mqtt_string(topic) + (b"\x00\x07" if qos else b"") + payload.encode()
                conn.sendall(cs.mqtt_packet(0x31 | qos << 1, body))
            try:
                cs.read_packet(conn)                             # DISCONNECT
            except (OSError, ConnectionError):
                pass

    threading.Thread(target=serve, daemon=True).start()
    return server.getsockname()[1]


def test_mqtt_probe_reads_robot_status():
    port = fake_broker([("robin/robin-01/status", "online", 1), ("robin/sim-01/status", "offline", 0)])
    result = cs.mqtt_probe("127.0.0.1", port, listen_s=0.5)
    assert result["connack"] == 0
    assert result["statuses"] == {"robin-01": "online", "sim-01": "offline"}


def test_mqtt_probe_reports_nothing_listening():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]
    result = cs.mqtt_probe("127.0.0.1", port)
    assert not result["reachable"] and result["connack"] is None and "refused" in result["error"]


def test_db_stats_counts_rows_per_device(cfg, conn):
    for seq in range(3):
        db.insert_telemetry(conn, "robin-01", 1000.0 + seq * 2, telemetry(seq))
    conn.commit()
    assert cs.db_stats(cs.Path(cfg["database"])) == [("robin-01", 3, 1000.0, 1004.0)]
    assert isinstance(cs.db_stats(cs.Path(cfg["database"]).with_name("missing.db")), str)
