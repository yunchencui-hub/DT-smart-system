"""Setup check: does this computer match docs/05_software_setup.md?

Run it from anywhere, with or without the venv active:

    python check_setup.py            (in backend/; Windows, macOS and Linux)
    python check_setup.py --quick    skip the slow parts (pytest, firmware compile)

It only looks and tests; it installs and changes nothing. Every line is OK / WARN / FAIL / INFO, with the
part of docs/05 to read when something is wrong. Secrets (WiFi name and password, ntfy topic) are never
printed, so you can paste the whole output into a chat.

Standard library only, on purpose: it must also work when `pip install` has not worked yet.
"""
from __future__ import annotations

import argparse
import json
import os
import platform
import plistlib
import re
import shutil
import socket
import sqlite3
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

BACKEND = Path(__file__).resolve().parent
REPO = BACKEND.parent
FIRMWARE = REPO / "firmware" / "robin"
HOME = Path.home()
WINDOWS = sys.platform == "win32"
MAC = sys.platform == "darwin"
MIN_PYTHON = (3, 11)
BOARD_FQBN = "arduino:renesas_uno:unor4wifi"

# Files that come with the repository; a missing one means an incomplete download.
REPO_FILES = ["backend/robin/__main__.py", "backend/requirements.txt", "backend/config.example.yaml",
              "broker/mosquitto.conf", "firmware/robin/robin.ino", "firmware/robin/voice.h",
              "firmware/robin/face.h", "firmware/robin/arduino_secrets.example.h", "audio/tracks.yaml",
              "audio/en/durations.json"]

# Runs inside the project's venv (it has yaml, joblib, ...), prints one JSON line.
VENV_PROBE = r'''
import json, sys, warnings
from importlib import metadata
from pathlib import Path
warnings.filterwarnings("ignore")
out = {"python": list(sys.version_info[:3]), "packages": {}}
for line in open("requirements.txt", encoding="utf-8"):
    name = line.split("#")[0].strip().split(">")[0].split("=")[0].split("<")[0].strip()
    if name:
        try:
            out["packages"][name] = metadata.version(name)
        except metadata.PackageNotFoundError:
            out["packages"][name] = None
try:
    from robin.config import load_config, model_file, resolve
    cfg = load_config("config.yaml")
    topic = cfg["caregiver"].get("ntfy_topic") or ""
    out["config"] = {"device_id": cfg["device_id"], "mqtt_host": cfg["mqtt"]["host"],
                     "mqtt_port": cfg["mqtt"]["port"], "mqtt_user": bool(cfg["mqtt"].get("username")),
                     "ntfy_server": cfg["caregiver"]["ntfy_server"],
                     "ntfy_len": len(topic), "ntfy_digit": any(c.isdigit() for c in topic),
                     "database": str(resolve(cfg, cfg["database"])),
                     "model": str(model_file(cfg)),
                     "durations": resolve(cfg, cfg["audio"]["durations_file"]).exists(),
                     "location": [cfg["location"]["latitude"], cfg["location"]["longitude"]]}
except Exception as e:
    out["config_error"] = f"{type(e).__name__}: {e}"
model = Path(out.get("config", {}).get("model", "-"))
if model.exists():
    try:
        import joblib
        meta = dict(getattr(joblib.load(model), "meta", {}))
        out["model"] = {k: meta.get(k) for k in ("device", "synthetic", "trained_at", "windows", "algorithm")}
    except Exception as e:
        out["model_error"] = f"{type(e).__name__}: {e}"
print("JSON" + json.dumps(out, default=str))
'''


# ---------- output ----------
class Report:
    def __init__(self) -> None:
        self.counts = {"OK": 0, "WARN": 0, "FAIL": 0, "INFO": 0}
        self.fails: list[str] = []

    def section(self, title: str) -> None:
        print(f"\n== {title} ==", flush=True)

    def add(self, status: str, text: str, fix: str = "", where: str = "") -> None:
        self.counts[status] += 1
        print(f"[{status:^4}] {text}", flush=True)
        if fix:
            print(f"       -> {fix}" + (f"  (docs/05 {where})" if where else ""), flush=True)
        if status == "FAIL":
            self.fails.append(text + (f"  (docs/05 {where})" if where else ""))


def show(path: Path | str) -> str:
    """Path for printing, with the home folder shortened to ~ (keeps your user name out of pasted output)."""
    text, home = str(path), str(HOME)
    return "~" + text[len(home):] if text.startswith(home) else text


def run(cmd: list[str], timeout: float = 30, cwd: Path | None = None, env: dict | None = None) -> tuple[int, str]:
    try:
        r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout,
                           encoding="utf-8", errors="replace", env=env)
        return r.returncode, (r.stdout or "") + (r.stderr or "")
    except FileNotFoundError:
        return 127, "not found"
    except subprocess.TimeoutExpired:
        return 124, f"timed out after {timeout:.0f} s"
    except OSError as e:
        return 126, str(e)


def powershell(script: str, timeout: float = 40) -> tuple[int, str]:
    return run(["powershell", "-NoProfile", "-NonInteractive", "-Command", script], timeout)


def version_tuple(text: str) -> tuple[int, ...]:
    """'2.1.0' -> (2, 1, 0); '1.3rc1' -> (1, 3). Enough to compare with the minimums in requirements.txt."""
    parts = []
    for piece in str(text).split("."):
        digits = re.match(r"\d+", piece)
        if not digits:
            break
        parts.append(int(digits.group()))
    return tuple(parts)


def requirement_minimums(path: Path) -> dict[str, str]:
    result = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.split("#")[0].strip()
        if line:
            name, _, minimum = line.partition(">=")
            result[name.strip()] = minimum.strip()
    return result


def parse_secrets(text: str) -> dict[str, str]:
    """#define SECRET_X "value" (or a bare number) -> {"SECRET_X": "value"}."""
    result = {}
    for m in re.finditer(r'^\s*#define\s+(SECRET_\w+)\s+(?:"([^"\n]*)"|(\S+))', text, re.M):
        result[m.group(1)] = m.group(2) if m.group(2) is not None else m.group(3)
    return result


def assess_secrets(s: dict[str, str], example: dict[str, str], device_id: str | None,
                   laptop_ips: list[str]) -> list[tuple[str, str, str, str]]:
    """Checks arduino_secrets.h like a careful partner would. Returns (status, text, fix, where) rows."""
    rows = []
    missing = [k for k in example if k not in s]
    if missing:
        rows.append(("FAIL", f"arduino_secrets.h misses {', '.join(missing)}",
                     "copy arduino_secrets.example.h again and fill it in", "A.4"))
    ssid, password, host = s.get("SECRET_WIFI_SSID", ""), s.get("SECRET_WIFI_PASS", ""), s.get("SECRET_MQTT_HOST", "")
    if ssid == "":
        rows.append(("OK", "WiFi name is \"\": offline test mode (fine for A and docs/04)", "", ""))
        rows.append(("INFO", "for Part C put your hotspot's name, password and the laptop's IP here, then upload",
                     "", "C.1"))
    elif ssid == example.get("SECRET_WIFI_SSID"):
        rows.append(("WARN", "WiFi name is still the example's placeholder",
                     "for the first tests make it \"\" (offline test mode); for Part C your hotspot's name", "A.4"))
    elif "eduroam" in ssid.lower():
        rows.append(("FAIL", "WiFi name is eduroam: the UNO R4 cannot log in to eduroam (WPA2-Enterprise)",
                     "use your phone's hotspot (2.4 GHz)", "C.1"))
    else:
        rows.append(("OK", "WiFi name is set (not shown)", "", ""))
        if password == example.get("SECRET_WIFI_PASS"):
            rows.append(("WARN", "WiFi password is still the example's placeholder",
                         "put your hotspot's password", "C.1"))
        if host in ("localhost", "127.0.0.1"):
            rows.append(("FAIL", f"MQTT host is {host}: on the robot that means the robot itself",
                         "put the laptop's IP address" + (f" ({laptop_ips[0]})" if laptop_ips else ""), "C.1"))
        elif laptop_ips and host not in laptop_ips:
            rows.append(("WARN", f"MQTT host {host} is not this laptop's IP ({', '.join(laptop_ips)})",
                         "update SECRET_MQTT_HOST and upload again (the IP changes when the hotspot restarts)", "C.1"))
        elif laptop_ips and host != laptop_ips[0]:
            rows.append(("WARN", f"MQTT host {host} belongs to this laptop, but not to the network it uses now "
                                 f"({laptop_ips[0]})", "use the Wi-Fi adapter's IPv4 address", "C.1"))
        elif laptop_ips:
            rows.append(("OK", f"MQTT host {host} = this laptop's IP", "", ""))
    robot_id = s.get("SECRET_DEVICE_ID")
    if robot_id and device_id and robot_id != device_id:
        rows.append(("FAIL", f"robot calls itself '{robot_id}' but config.yaml listens to '{device_id}'",
                     "make device_id in backend/config.yaml and SECRET_DEVICE_ID the same", "C.3"))
    elif robot_id:
        text = f"device id '{robot_id}'" + (" matches config.yaml" if device_id else "")
        rows.append(("OK", text, "", ""))
    return rows


# ---------- a tiny MQTT 3.1.1 client: just enough to prove a broker answers ----------
def _mqtt_string(text: str) -> bytes:
    data = text.encode()
    return len(data).to_bytes(2, "big") + data


def mqtt_packet(kind: int, body: bytes) -> bytes:
    n, length = len(body), bytearray()
    while True:
        byte, n = n % 128, n // 128
        length.append(byte | (0x80 if n else 0))
        if not n:
            return bytes([kind]) + bytes(length) + body


def _recv_exact(sock: socket.socket, n: int) -> bytes:
    data = b""
    while len(data) < n:
        chunk = sock.recv(n - len(data))
        if not chunk:
            raise ConnectionError("the broker closed the connection")
        data += chunk
    return data


def read_packet(sock: socket.socket) -> tuple[int, bytes]:
    head = _recv_exact(sock, 1)[0]
    length, factor = 0, 1
    while True:
        byte = _recv_exact(sock, 1)[0]
        length += (byte & 0x7F) * factor
        if not byte & 0x80:
            return head, _recv_exact(sock, length)
        factor *= 128


def mqtt_probe(host: str, port: int = 1883, timeout: float = 3.0, listen_s: float = 1.5) -> dict:
    """CONNECT -> CONNACK, then read the retained robin/+/status messages (which robots are online)."""
    result: dict = {"reachable": False, "connack": None, "statuses": {}, "error": ""}
    try:
        with socket.create_connection((host, port), timeout=timeout) as sock:
            result["reachable"] = True
            body = _mqtt_string("MQTT") + bytes([4, 0x02]) + (10).to_bytes(2, "big") \
                + _mqtt_string(f"robin-check-{os.getpid()}")
            sock.sendall(mqtt_packet(0x10, body))
            kind, data = read_packet(sock)
            if kind >> 4 != 2 or len(data) < 2:
                result["error"] = "something answers on this port, but it is not an MQTT broker"
                return result
            result["connack"] = data[1]
            if data[1] != 0:
                return result
            sock.sendall(mqtt_packet(0x82, (1).to_bytes(2, "big") + _mqtt_string("robin/+/status") + b"\x00"))
            deadline = time.monotonic() + listen_s
            while True:
                left = deadline - time.monotonic()
                if left <= 0:
                    break
                sock.settimeout(left)
                try:
                    kind, data = read_packet(sock)
                except socket.timeout:
                    break
                if kind >> 4 == 3:  # PUBLISH
                    n = int.from_bytes(data[:2], "big")
                    topic = data[2:2 + n].decode(errors="replace")
                    skip = 2 if (kind >> 1) & 3 else 0  # QoS > 0 carries a packet id
                    parts = topic.split("/")
                    if len(parts) == 3:
                        result["statuses"][parts[1]] = data[2 + n + skip:].decode(errors="replace").strip()
            sock.sendall(b"\xe0\x00")  # DISCONNECT
    except ConnectionRefusedError:
        result["error"] = "refused (nothing listens there)"
    except socket.timeout:
        result["error"] = "no answer within %.0f s" % timeout
    except (OSError, ConnectionError) as e:
        result["error"] = str(e)
    return result


# ---------- this computer ----------
def laptop_ips() -> list[str]:
    """IPv4 addresses of this laptop, the one of the network in use first."""
    ips: list[str] = []
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("192.0.2.1", 9))  # TEST-NET address: sends nothing, only picks the outgoing adapter
            ips.append(s.getsockname()[0])
    except OSError:
        pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            if info[4][0] not in ips:
                ips.append(info[4][0])
    except OSError:
        pass
    return [ip for ip in ips if not ip.startswith(("127.", "169.254.", "0."))]


def laptop_ssid() -> str | None:
    """Name of the Wi-Fi the laptop is on (only compared, never printed). None = couldn't tell."""
    if WINDOWS:
        code, out = run(["netsh", "wlan", "show", "interfaces"], 15)
        found = re.search(r"^\s*SSID\s*:\s*(.+?)\s*$", out, re.M) if code == 0 else None
    elif MAC:
        found = None
        for dev in ("en0", "en1"):
            code, out = run(["networksetup", "-getairportnetwork", dev], 10)
            found = re.search(r"Network:\s*(.+?)\s*$", out, re.M) if code == 0 else None
            if found:
                break
    else:
        code, out = run(["nmcli", "-t", "-f", "active,ssid", "dev", "wifi"], 10)
        found = re.search(r"^yes:(.+)$", out, re.M) if code == 0 else None
    return found.group(1) if found else None


def find_venv_python() -> tuple[Path | None, str]:
    for where, folder in (("backend/.venv", BACKEND / ".venv"), ("repo-root .venv", REPO / ".venv")):
        exe = folder / ("Scripts/python.exe" if WINDOWS else "bin/python")
        if exe.exists():
            return exe, where
    return None, ""


def venv_is_active(venv_python: Path) -> bool:
    venv_dir = venv_python.parent.parent.resolve()
    active = os.environ.get("VIRTUAL_ENV")
    return Path(sys.prefix).resolve() == venv_dir or bool(active and Path(active).resolve() == venv_dir)


# ---------- Arduino ----------
def ide_installs() -> list[tuple[Path, Path]]:
    """(IDE folder, folder that holds resources/app) for every Arduino IDE 2 found."""
    if WINDOWS:
        roots = [Path(os.environ.get("LOCALAPPDATA", HOME / "AppData/Local")) / "Programs/Arduino IDE",
                 Path(os.environ.get("ProgramFiles", r"C:\Program Files")) / "Arduino IDE"]
        return [(r, r) for r in roots if (r / "Arduino IDE.exe").exists()]
    if MAC:
        apps = [Path("/Applications/Arduino IDE.app"), HOME / "Applications/Arduino IDE.app"]
        return [(a, a / "Contents") for a in apps if a.exists()]
    found = shutil.which("arduino-ide")
    if found:
        root = Path(found).resolve().parent
        return [(root, root)]
    return []


def ide1_installed() -> bool:
    if WINDOWS:
        return any((Path(os.environ.get(v, "")) / "Arduino/arduino.exe").exists()
                   for v in ("ProgramFiles", "ProgramFiles(x86)") if os.environ.get(v))
    return MAC and Path("/Applications/Arduino.app").exists()


def ide_version(app_root: Path) -> str:
    for package in (app_root / "resources/app/package.json", app_root / "Resources/app/package.json"):
        try:
            return json.loads(package.read_text(encoding="utf-8")).get("version", "?")
        except (OSError, ValueError):
            pass
    try:  # macOS app bundle
        with open(app_root / "Info.plist", "rb") as f:
            return plistlib.load(f).get("CFBundleShortVersionString", "?")
    except (OSError, ValueError, plistlib.InvalidFileException):
        return "?"


def arduino_dirs() -> tuple[Path, list[Path], Path | None]:
    """(Arduino15 data folder, sketchbook candidates, IDE's arduino-cli.yaml or None)."""
    if WINDOWS:
        data = Path(os.environ.get("LOCALAPPDATA", HOME / "AppData/Local")) / "Arduino15"
    elif MAC:
        data = HOME / "Library/Arduino15"
    else:
        data = HOME / ".arduino15"
    books = [HOME / "Documents/Arduino", HOME / "Arduino"]
    books += sorted(HOME.glob("OneDrive*/*/Arduino"))  # Windows often moves Documents into OneDrive
    config = HOME / ".arduinoIDE/arduino-cli.yaml"
    if config.exists():
        text = config.read_text(encoding="utf-8", errors="replace")
        block = re.search(r"^directories:[ \t]*\n((?:[ \t]+.*(?:\n|$))*)", text, re.M)
        for key, value in re.findall(r"^[ \t]+(data|user):[ \t]*(.+?)[ \t]*$", block.group(1) if block else "", re.M):
            value = Path(value.strip("'\""))
            if key == "data":
                data = value
            else:
                books.insert(0, value)
    return data, books, config if config.exists() else None


def find_library(books: list[Path], name: str) -> tuple[Path, str] | None:
    for book in books:
        for props in sorted((book / "libraries").glob("*/library.properties")):
            text = props.read_text(encoding="utf-8", errors="replace")
            if re.search(rf"^name\s*=\s*{re.escape(name)}\s*$", text, re.M):
                version = re.search(r"^version\s*=\s*(\S+)", text, re.M)
                return props.parent, version.group(1) if version else "?"
    return None


def find_arduino_cli(installs: list[tuple[Path, Path]]) -> Path | None:
    exe = "arduino-cli.exe" if WINDOWS else "arduino-cli"
    for _, app_root in installs:  # the IDE 2 ships its own arduino-cli
        for sub in ("resources/app/lib/backend/resources", "Resources/app/lib/backend/resources",
                    "resources/app/node_modules/arduino-ide-extension/lib/backend/resources",
                    "Resources/app/node_modules/arduino-ide-extension/lib/backend/resources"):
            if (app_root / sub / exe).exists():
                return app_root / sub / exe
    found = shutil.which("arduino-cli")
    return Path(found) if found else None


# ---------- Mosquitto ----------
def find_mosquitto() -> tuple[Path | None, bool]:
    """(path, on PATH?)"""
    found = shutil.which("mosquitto")
    if found:
        return Path(found), True
    if WINDOWS:
        candidates = [Path(os.environ.get(v, "")) / "mosquitto/mosquitto.exe"
                      for v in ("ProgramFiles", "ProgramFiles(x86)") if os.environ.get(v)]
    elif MAC:
        candidates = [Path("/opt/homebrew/sbin/mosquitto"), Path("/usr/local/sbin/mosquitto"),
                      Path("/opt/homebrew/opt/mosquitto/sbin/mosquitto")]
    else:
        candidates = [Path("/usr/sbin/mosquitto"), Path("/usr/local/sbin/mosquitto"), Path("/snap/bin/mosquitto")]
    for c in candidates:
        if c.exists():
            return c, False
    return None, False


def mosquitto_service() -> tuple[str, str]:
    """Is a Mosquitto *service* (started by the installer / Homebrew / systemd) running? -> (state, detail)"""
    if WINDOWS:
        code, out = run(["sc.exe", "query", "mosquitto"], 10)
        if code == 1060 or "1060" in out:
            return "none", ""
        state = re.search(r"STATE\s*:\s*(\d)", out)
        _, qc = run(["sc.exe", "qc", "mosquitto"], 10)
        auto = re.search(r"START_TYPE\s*:\s*2", qc) is not None
        if state and state.group(1) == "4":
            return "running", "starts automatically" if auto else ""
        return ("stopped-auto", "") if auto else ("stopped", "")
    if MAC:
        code, out = run(["brew", "services", "list"], 20)
        line = re.search(r"^mosquitto\s+(\w+)", out, re.M) if code == 0 else None
        return ("running", "brew services") if line and line.group(1) == "started" else ("none", "")
    code, out = run(["systemctl", "is-active", "mosquitto"], 10)
    return ("running", "systemd") if out.strip() == "active" else ("none", "")


def windows_firewall() -> tuple[str, str]:
    """Inbound rules for mosquitto.exe -> ('ok'|'block'|'public-only'|'none'|'unknown', profiles)."""
    script = ("Get-NetFirewallApplicationFilter | Where-Object { $_.Program -like '*mosquitto*' } | "
              "Get-NetFirewallRule | Where-Object { $_.Direction -eq 'Inbound' -and $_.Enabled -eq 'True' } | "
              "ForEach-Object { '{0}|{1}' -f $_.Action, $_.Profile }")
    code, out = powershell(script, 60)
    if code != 0:
        return "unknown", ""
    rules = [line.split("|", 1) for line in out.splitlines() if "|" in line]

    def covers_private(profile: str) -> bool:
        return "Private" in profile or "Any" in profile
    if any(a.strip() == "Block" and covers_private(p) for a, p in rules):
        return "block", ", ".join(p.strip() for a, p in rules if a.strip() == "Block")
    if any(a.strip() == "Allow" and covers_private(p) for a, p in rules):
        return "ok", ""
    if rules:
        return "public-only", ", ".join(p.strip() for _, p in rules)
    return "none", ""


def reachable(url: str, tries: int = 2) -> str:
    """'' if a web server answers (any HTTP status), else the error. Same 10 s timeout as robin/weather.py."""
    error = ""
    for _ in range(tries):
        try:
            urllib.request.urlopen(urllib.request.Request(url, method="HEAD"), timeout=10)
            return ""
        except urllib.error.HTTPError:
            return ""
        except Exception as e:  # noqa: BLE001 - any network problem is just "not reachable"
            error = str(getattr(e, "reason", e))
    return error


def db_stats(path: Path) -> list[tuple[str, int, float, float]] | str:
    """(device, rows, first ts, last ts) per device, read-only. A string = couldn't read."""
    try:
        conn = sqlite3.connect(f"file:{path.as_posix()}?mode=ro", uri=True, timeout=3)
        try:
            return conn.execute("SELECT device, COUNT(*), MIN(ts), MAX(ts) FROM telemetry GROUP BY device").fetchall()
        finally:
            conn.close()
    except sqlite3.Error as e:
        return str(e)


# ---------- the checks, in the order of docs/05 ----------
def check_computer(r: Report) -> None:
    r.section("This computer")
    r.add("INFO", f"{platform.system()} {platform.release()} ({platform.machine()}), "
                  f"Python {platform.python_version()} at {show(sys.executable)}")
    r.add("INFO", f"project folder: {show(REPO)}")
    if any(word in str(REPO) for word in ("OneDrive", "Dropbox", "Mobile Documents", "Google Drive")):
        r.add("WARN", "the project is inside a cloud-synced folder: syncing fights the venv and the live database",
              "move the folder out of it, e.g. to "
              + ("C:\\Users\\<you>\\DT-smart-system" if WINDOWS else "~/DT-smart-system"))
    missing = [f for f in REPO_FILES if not (REPO / f).exists()]
    if missing:
        r.add("FAIL", f"project files missing: {', '.join(missing)}", "download or clone the repository again")
    else:
        r.add("OK", "all project files are there")
    if (REPO / ".git").exists() and shutil.which("git"):
        _, head = run(["git", "-C", str(REPO), "log", "-1", "--format=%h %cs"], 10)
        _, behind = run(["git", "-C", str(REPO), "rev-list", "--count", "HEAD..origin/main"], 10)
        _, changed = run(["git", "-C", str(REPO), "status", "--porcelain", "--untracked-files=no"], 10)
        text = f"git version {head.strip()}"
        if behind.strip().isdigit() and int(behind) > 0:
            text += f", {behind.strip()} commits behind origin/main (as of your last pull)"
        if changed.strip():
            text += f", {len(changed.strip().splitlines())} changed file(s)"
        r.add("INFO", text)


def check_arduino(r: Report, quick: bool, device_id: str | None, ips: list[str]) -> dict:
    r.section("A. Arduino IDE and firmware")
    installs = ide_installs()
    if installs:
        for folder, app_root in installs:
            version = ide_version(app_root)
            status = "WARN" if version.startswith("1.") else "OK"
            r.add(status, f"Arduino IDE {version} at {show(folder)}",
                  "install Arduino IDE 2" if status == "WARN" else "", "A.1" if status == "WARN" else "")
    elif ide1_installed():
        r.add("WARN", "only the old Arduino IDE 1.x is installed", "install Arduino IDE 2", "A.1")
    elif WINDOWS or MAC:
        r.add("WARN", "Arduino IDE 2 not found in the usual folders (fine if you have no board yet; "
                      "a Microsoft Store install can't be seen, check by hand)", "install it", "A.1")
    else:
        r.add("INFO", "Arduino IDE: can't find it on Linux automatically (AppImage), check by hand")

    data, books, ide_config = arduino_dirs()
    cores = sorted((data / "packages/arduino/hardware/renesas_uno").glob("*"), key=lambda p: version_tuple(p.name))
    if cores:
        r.add("OK", f"board package \"Arduino UNO R4 Boards\" {cores[-1].name}")
    else:
        r.add("WARN", "board package \"Arduino UNO R4 Boards\" not installed",
              "Tools > Board > Boards Manager > \"Arduino UNO R4 Boards\" > Install", "A.2")
    library = find_library(books, "ArduinoMqttClient")
    if library:
        r.add("OK", f"library ArduinoMqttClient {library[1]}")
    else:
        r.add("WARN", "library ArduinoMqttClient not found",
              "Tools > Manage Libraries > ArduinoMqttClient (by Arduino) > Install", "A.3")

    secrets, example_file = FIRMWARE / "arduino_secrets.h", FIRMWARE / "arduino_secrets.example.h"
    example = parse_secrets(example_file.read_text(encoding="utf-8", errors="replace")) if example_file.exists() else {}
    lookalikes = [p.name for p in (FIRMWARE.iterdir() if FIRMWARE.exists() else [])
                  if p.name.lower().startswith("arduino_secrets") and p.name not in
                  ("arduino_secrets.h", "arduino_secrets.example.h")]
    for name in lookalikes:
        if secrets.exists() and name.lower() == "arduino_secrets.h":
            continue  # Windows and macOS ignore capitals: it is the same file
        if secrets.exists():
            r.add("WARN", f"firmware/robin/{name}: an extra copy next to arduino_secrets.h",
                  "delete it, so you never edit the wrong file", "A.4")
        else:
            r.add("FAIL", f"firmware/robin/{name}: wrong file name",
                  "rename it to exactly arduino_secrets.h (Windows hides extensions like .txt: "
                  "File Explorer > View > Show > File name extensions)", "A.4")
    parsed: dict[str, str] = {}
    if secrets.exists():
        parsed = parse_secrets(secrets.read_text(encoding="utf-8", errors="replace"))
        r.add("OK", "firmware/robin/arduino_secrets.h exists")
        for row in assess_secrets(parsed, example, device_id, ips):
            r.add(*row)
    else:
        r.add("WARN", "firmware/robin/arduino_secrets.h is missing (the sketch won't compile without it)",
              "copy arduino_secrets.example.h to arduino_secrets.h, set SECRET_WIFI_SSID to \"\"", "A.4")

    cli = find_arduino_cli(installs)
    if quick:
        r.add("INFO", "firmware compile skipped (--quick)")
    elif not secrets.exists() or not cores:
        r.add("INFO", "firmware compile skipped: needs the board package and arduino_secrets.h first")
    elif not cli:
        r.add("INFO", "couldn't find the IDE's compiler: compile in the IDE instead (the check-mark button, Verify)")
    else:
        print("       compiling firmware/robin for the UNO R4 WiFi (up to 2 minutes the first time)...", flush=True)
        with tempfile.TemporaryDirectory() as build:
            cmd = [str(cli), "compile", "-b", BOARD_FQBN, "--build-path", build, str(FIRMWARE)]
            if ide_config:
                cmd[1:1] = ["--config-file", str(ide_config)]
            code, out = run(cmd, 600)
        used = re.search(r"Sketch uses \d+ bytes \((\d+)%\)", out)
        if code == 0:
            r.add("OK", "firmware compiles for the UNO R4 WiFi" + (f" ({used.group(1)}% of flash)" if used else ""))
        else:
            errors = [line.strip() for line in out.splitlines() if "error" in line.lower()][:3]
            errors = errors or out.strip().splitlines()[-3:]
            fix, where = "read the first error line; paste it to Claude", "A"
            if "ArduinoMqttClient" in out:
                fix, where = "install the ArduinoMqttClient library", "A.3"
            elif "renesas" in out.lower() and "not" in out.lower():
                fix, where = "install \"Arduino UNO R4 Boards\"", "A.2"
            errors = [show(e.replace(str(REPO) + os.sep, "")) for e in errors]
            r.add("FAIL", "firmware does not compile: " + " | ".join(errors), fix, where)

    board = None
    if WINDOWS:
        code, out = powershell("Get-CimInstance Win32_PnPEntity | Where-Object { $_.DeviceID -like '*VID_2341*' } | "
                               "ForEach-Object { $_.Name }", 40)
        board = out.strip().splitlines()[0] if code == 0 and out.strip() else None
    else:
        ports = sorted(Path("/dev/serial/by-id").glob("*Arduino*")) if Path("/dev/serial/by-id").exists() else []
        ports = ports or sorted(Path("/dev").glob("cu.usbmodem*" if MAC else "ttyACM*"))
        board = ports[0].name if ports else None
    r.add("INFO", f"board on USB: {board}" if board
          else "no Arduino board plugged in right now (only matters for uploading)")
    r.add("INFO", "by hand: Upload works, Serial Monitor at 115200 baud + \"Newline\", `help` answers")
    return parsed


def probe_venv(venv: Path | None) -> tuple[dict | None, str]:
    """Runs VENV_PROBE in the venv: (result, error). Fast, so A can compare with config.yaml before B prints."""
    if not venv:
        return None, ""
    code, out = run([str(venv), "-c", VENV_PROBE], 120, cwd=BACKEND)
    line = next((x for x in out.splitlines() if x.startswith("JSON")), None)
    return (json.loads(line[4:]), "") if line else (None, (out.strip().splitlines() or ["?"])[-1])


def check_python(r: Report, quick: bool, venv: Path | None, where: str, probe: dict | None, error: str) -> None:
    r.section("B. Python backend")
    if not venv:
        r.add("FAIL", "no venv found in backend/.venv",
              "in backend/: python -m venv .venv, activate it, pip install -r requirements.txt", "B")
        if not (BACKEND / "config.yaml").exists():
            r.add("FAIL", "backend/config.yaml is missing", "in backend/: copy config.example.yaml config.yaml", "B")
        return
    r.add("OK" if where == "backend/.venv" else "WARN", f"venv found: {where}",
          "" if where == "backend/.venv" else "the manual puts it in backend/; works if you always activate this one",
          "B")
    if venv_is_active(venv):
        r.add("OK", "the venv is active in this terminal")
    else:
        activate = r".venv\Scripts\activate" if WINDOWS else "source .venv/bin/activate"
        r.add("INFO", f"the venv is not active in this terminal: run `{activate}` in backend/ "
                      "before `python -m robin ...`")
        if WINDOWS:
            code, policy = powershell("Get-ExecutionPolicy", 20)
            if code == 0 and policy.strip() in ("Restricted", "AllSigned", "Undefined"):
                r.add("WARN", f"PowerShell's script policy is {policy.strip()}: `.venv\\Scripts\\activate` will say "
                              "\"running scripts is disabled on this system\"",
                      "once: Set-ExecutionPolicy -Scope CurrentUser RemoteSigned  (or use Command Prompt: "
                      ".venv\\Scripts\\activate.bat)", "B")

    if probe is None:
        r.add("FAIL", f"the venv's Python does not run: {error}", "delete backend/.venv and create it again", "B")
        return
    py = tuple(probe["python"])
    r.add("OK" if py >= MIN_PYTHON else "FAIL", "venv Python %d.%d.%d" % py,
          "" if py >= MIN_PYTHON else "install Python 3.11 or newer, then create the venv again", "B")

    minimums = requirement_minimums(BACKEND / "requirements.txt")
    missing = [n for n, v in probe["packages"].items() if v is None]
    old = [f"{n} {v} (needs >= {minimums[n]})" for n, v in probe["packages"].items()
           if v and minimums.get(n) and version_tuple(v) < version_tuple(minimums[n])]
    if missing or old:
        r.add("FAIL", "packages: " + ", ".join([f"{n} missing" for n in missing] + old),
              "with the venv active, in backend/: pip install -r requirements.txt", "B")
    else:
        packages = probe["packages"]
        r.add("OK", f"all {len(packages)} packages from requirements.txt installed "
                    f"(paho-mqtt {packages.get('paho-mqtt')}, scikit-learn {packages.get('scikit-learn')})")

    if not (BACKEND / "config.yaml").exists():
        r.add("FAIL", "backend/config.yaml is missing", "in backend/: copy config.example.yaml config.yaml", "B")
    elif probe.get("config_error"):
        r.add("FAIL", f"config.yaml can't be read: {probe['config_error']}",
              "check the line it names (YAML: spaces, not tabs; colon + space)", "B")
    else:
        c = probe["config"]
        r.add("OK", f"config.yaml: device_id '{c['device_id']}', broker {c['mqtt_host']}:{c['mqtt_port']}")
        if not c["durations"]:
            r.add("WARN", "audio durations file from config.yaml not found (the talking face won't know track lengths)")

    if quick:
        r.add("INFO", "pytest skipped (--quick)")
    elif probe["packages"].get("pytest"):
        print("       running the tests (python -m pytest -q)...", flush=True)
        env = dict(os.environ, PYTHONDONTWRITEBYTECODE="1")
        code, out = run([str(venv), "-m", "pytest", "-q", "-p", "no:cacheprovider"], 600, cwd=BACKEND, env=env)
        summary = next((x.strip("= ") for x in reversed(out.splitlines())
                        if re.search(r"\d+ (passed|failed|error)", x)), "")
        if code == 0:
            r.add("OK", f"tests: {summary}")
        else:
            failed = [x[7:].split(" - ")[0] for x in out.splitlines() if x.startswith("FAILED ")][:3]
            summary = summary or (out.strip().splitlines() or ["?"])[-1]
            r.add("FAIL", f"tests: {summary}" + (f" ({', '.join(failed)})" if failed else ""),
                  "paste the pytest output to Claude", "B")
    else:
        r.add("INFO", "tests skipped: pytest is not installed yet (it comes with requirements.txt)")

    if "config" in probe:
        stats = db_stats(Path(probe["config"]["database"])) if Path(probe["config"]["database"]).exists() else []
        if isinstance(stats, str):
            r.add("INFO", f"database: couldn't read it ({stats})")
        else:
            sims = [s for s in stats if s[0].startswith("sim")]
            real = [s for s in stats if not s[0].startswith("sim")]
            if sims:
                r.add("OK", "simulator run done: " + ", ".join(f"{d} {n:,} rows" for d, n, *_ in sims))
            else:
                r.add("INFO", "no simulator data yet: do \"Your first complete run\"", "", "B")
            for device, n, first, last in real:
                r.add("INFO", f"real data from {device}: {n:,} rows over {(last - first) / 86400:.1f} days, "
                              f"last {time.strftime('%Y-%m-%d %H:%M', time.localtime(last))} (docs/06 wants >= 7 days)")
    if probe.get("model"):
        m = probe["model"]
        when = time.strftime("%Y-%m-%d", time.localtime(float(m["trained_at"]))) if m.get("trained_at") else "?"
        kind = "simulator data, a dry run only" if m.get("synthetic") else "your own data"
        r.add("INFO", f"model: {m.get('algorithm')} trained {when} on {m.get('device')} "
                      f"({kind}, {m.get('windows')} windows)")
    elif probe.get("model_error"):
        r.add("WARN", f"model file can't be loaded: {probe['model_error']}", "train again", "B")


def check_network(r: Report, ips: list[str], secrets: dict[str, str], port: int, has_login: bool) -> None:
    r.section("C. Network: Mosquitto and the robot's connection")
    exe, on_path = find_mosquitto()
    if not exe:
        r.add("FAIL", "Mosquitto is not installed (the simulator run needs it too)", "install it", "C.2")
    else:
        _, out = run([str(exe), "-h"], 10)
        version = re.search(r"mosquitto version (\S+)", out)
        note = "" if on_path else " (not on PATH: start it with the full path, like the manual's command)"
        r.add("OK", f"Mosquitto {version.group(1) if version else '?'} at {show(exe)}{note}")
    conf = (REPO / "broker/mosquitto.conf").read_text(encoding="utf-8", errors="replace")
    if re.search(r"^listener\s+1883\s+0\.0\.0\.0", conf, re.M) and re.search(r"^allow_anonymous\s+true", conf, re.M):
        r.add("OK", "broker/mosquitto.conf listens on the network (0.0.0.0:1883, no password)")
    else:
        r.add("WARN", "broker/mosquitto.conf was changed: the robot may not get in",
              "restore it from the repository", "C.2")

    if ips:
        r.add("INFO", f"this laptop's IP: {ips[0]}" + (f" (also {', '.join(ips[1:])})" if ips[1:] else ""))
    else:
        r.add("WARN", "this laptop has no network address right now", "connect it to the hotspot", "C.1")
    ssid = laptop_ssid()
    robot_ssid = secrets.get("SECRET_WIFI_SSID", "")
    if ssid and "eduroam" in ssid.lower():
        r.add("WARN", "the laptop is on eduroam: the robot can't join it, and both must be on the same network",
              "connect the laptop to the same phone hotspot as the robot", "C.1")
    elif ssid and robot_ssid:
        same = ssid == robot_ssid
        r.add("OK" if same else "WARN", "laptop and robot use the same Wi-Fi" if same
              else "the laptop is on a different Wi-Fi than the one in arduino_secrets.h",
              "" if same else "connect the laptop to the robot's hotspot", "" if same else "C.1")

    local = mqtt_probe("127.0.0.1", port)
    service, detail = mosquitto_service()
    if not local["reachable"]:
        r.add("INFO", "no broker running right now (start it with the C.2 command and run this check again "
                      "to test the network part)")
    elif local["connack"] is None:
        r.add("FAIL", f"port {port}: {local['error']}", "free port 1883 and start our broker", "C.2")
    elif local["connack"] != 0 and has_login:
        r.add("INFO", f"the broker on port {port} wants a login (code {local['connack']}) and config.yaml has one: "
                      "fine if you set that up on purpose (this check doesn't log in)")
    elif local["connack"] != 0:
        r.add("FAIL", f"the broker on port {port} refuses us (code {local['connack']}: needs a password), "
                      "so it is not started with our config", "stop it, start ours with the C.2 command", "C.2")
    else:
        r.add("OK", f"a broker answers on localhost:{port}")
        lan = mqtt_probe(ips[0], port) if ips else None
        if lan and lan["connack"] == 0:
            r.add("OK", f"... and on {ips[0]}:{port}: it listens on the network, not only on this laptop"
                        + (" (firewall: see below)" if WINDOWS else ""))
        elif lan:
            r.add("FAIL", f"the broker answers on localhost but not on {ips[0]}:{port} ({lan['error'] or 'refused'}): "
                          "it only listens on this laptop, so the robot gets `[mqtt] failed, error -2`",
                  "it was started without our config (or it is the installer's service): stop it, "
                  "then start ours from the repo root with the C.2 command", "C.2")
        if service == "running" and not (lan and lan["connack"] == 0):
            r.add("WARN", "a Mosquitto service is running" + (f" ({detail})" if detail else "") +
                  ": it only listens on the laptop and holds port 1883",
                  "stop it and set it to Manual (Windows: services.msc > Mosquitto Broker)", "C.2")
        robots = {d: s for d, s in local["statuses"].items() if not d.startswith("sim")}
        for device, state in sorted(robots.items()):
            r.add("OK" if state == "online" else "INFO",
                  f"robot '{device}' is ONLINE right now" if state == "online"
                  else f"robot '{device}' was connected before and is now {state} (its Last Will)")
        if not robots:
            r.add("INFO", "no robot has connected to this broker yet (after an upload with WiFi set, it says `online`)")
    if service == "stopped-auto":
        r.add("WARN", "the Mosquitto Windows service starts automatically at boot, then holds port 1883",
              "services.msc > Mosquitto Broker > Startup type: Manual", "C.2")

    if WINDOWS:
        code, out = powershell("Get-NetConnectionProfile | ForEach-Object { '{0}|{1}' -f $_.InterfaceAlias, "
                               "$_.NetworkCategory }", 30)
        for alias, category in (x.split("|", 1) for x in out.splitlines() if "|" in x and code == 0):
            r.add("OK" if category.strip() != "Public" else "WARN",
                  f"Windows treats network '{alias.strip()}' as {category.strip()}",
                  "" if category.strip() != "Public" else
                  "Settings > Network > Wi-Fi > [hotspot] > Private (Public blocks the robot)", "C.2")
        state, profiles = windows_firewall()
        if state == "ok":
            r.add("OK", "Windows Firewall allows Mosquitto on Private networks")
        elif state == "block":
            r.add("FAIL", f"Windows Firewall BLOCKS Mosquitto ({profiles})",
                  "Windows Security > Firewall > Allow an app through firewall > mosquitto: tick Private "
                  "(and delete the Block rule in wf.msc > Inbound Rules)", "C.2")
        elif state == "public-only":
            r.add("WARN", f"Windows Firewall allows Mosquitto only on: {profiles}",
                  "Allow an app through firewall > mosquitto: tick Private", "C.2")
        elif state == "none":
            r.add("WARN", "no Windows Firewall rule for Mosquitto yet",
                  "the first time ours starts, Windows asks: click Allow, on Private networks", "C.2")
        else:
            r.add("INFO", "Windows Firewall: couldn't read the rules (check by hand)")
    elif MAC:
        _, out = run(["/usr/libexec/ApplicationFirewall/socketfilterfw", "--getglobalstate"], 10)
        if "enabled" in out.lower():
            r.add("INFO", "macOS firewall is on: when macOS asks, allow incoming connections for mosquitto")
    r.add("INFO", "the final proof is on the robot: its face turns happy and the broker log says "
                  "`New client connected ... as robin-01`")


def check_extras(r: Report, probe: dict) -> None:
    r.section("D. Caregiver phone and extras")
    c = probe.get("config")
    if c:
        if c["ntfy_len"] == 0:
            r.add("WARN", "no ntfy topic in config.yaml: caregiver alerts are only printed",
                  "install the ntfy app, pick a long random topic, put it in caregiver.ntfy_topic", "D")
        elif c["ntfy_len"] < 16 or not c["ntfy_digit"]:
            r.add("WARN", f"ntfy topic is short or easy to guess ({c['ntfy_len']} characters, not shown): "
                          "anyone who guesses it reads the alerts", "use something like robin-yourname-7f3kq29x", "D")
        else:
            r.add("OK", f"ntfy topic set ({c['ntfy_len']} characters, not shown)")
        for name, url in (("ntfy server", c["ntfy_server"]),
                          ("weather API (Open-Meteo)", "https://api.open-meteo.com/v1/forecast?latitude=%s&longitude=%s"
                           "&current=temperature_2m" % tuple(c["location"]))):
            error = reachable(url)
            r.add("OK" if not error else "WARN",
                  f"{name} reachable" if not error else f"{name} not reachable right now: {error}",
                  "" if not error else "check the internet connection (a phone hotspot is fine)")
    mp3 = {lang: len(list((REPO / "audio" / lang).glob("*.mp3"))) for lang in ("en", "nl")}
    r.add("OK" if all(mp3.values()) else "FAIL", f"voice files: {mp3['en']} English, {mp3['nl']} Dutch MP3s",
          "" if all(mp3.values()) else "download the repository again (audio/)")
    r.add("INFO", "not checked (optional): ntfy app on the phone, DB Browser for SQLite, VS Code, MQTT Explorer")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--quick", action="store_true", help="skip pytest and the firmware compile")
    args = parser.parse_args()
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(errors="replace")

    print(f"Robin setup check, {time.strftime('%Y-%m-%d %H:%M')}  "
          "(compares this computer with docs/05_software_setup.md)")
    r = Report()
    ips = laptop_ips()
    venv, where = find_venv_python()
    probe, error = probe_venv(venv)
    config = (probe or {}).get("config", {})
    check_computer(r)
    secrets = check_arduino(r, args.quick, config.get("device_id"), ips)
    check_python(r, args.quick, venv, where, probe, error)
    check_network(r, ips, secrets, int(config.get("mqtt_port", 1883)), bool(config.get("mqtt_user")))
    check_extras(r, probe or {})

    r.section("Summary")
    print(" | ".join(f"{k} {v}" for k, v in r.counts.items()))
    if r.fails:
        print("Fix first:\n" + "\n".join(f"  {i}. {f}" for i, f in enumerate(r.fails, 1)))
    else:
        print("No FAIL: the software matches the manual. WARN lines are worth a look; INFO lines are just facts.")
    print("Not sure about a line? Paste this whole output into your chat with Claude (no secrets are in it).")
    return 1 if r.fails else 0


if __name__ == "__main__":
    sys.exit(main())
