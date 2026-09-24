# 05 · Software setup: install, configure, run

Four parts. **Do B and the simulator run first, today.** You can see the whole system working before the parts arrive.

| Part | What | When |
|---|---|---|
| A | Arduino IDE + firmware | when you have the board |
| B | Python backend + simulator | **now** |
| C | Network: hotspot, Mosquitto, firewall | when you connect the real robot |
| D | Caregiver phone (ntfy) + handy tools | any time |

---

## A. Arduino IDE and firmware
1. Install **Arduino IDE 2** from <https://www.arduino.cc/en/software>.
2. *Tools → Board → Boards Manager*: install **"Arduino UNO R4 Boards"**.
3. *Tools → Manage Libraries*: install **ArduinoMqttClient** (by Arduino). That's the only extra library: the voice driver (`voice.h`) and faces (`face.h`) are in our own sketch, and WiFiS3 + LED matrix come with the board package.
4. In the folder `firmware/robin/`, copy `arduino_secrets.example.h` to **`arduino_secrets.h`**. For the first tests leave `SECRET_WIFI_SSID ""` (offline test mode).
5. Open `firmware/robin/robin.ino`. Choose *Tools → Board → Arduino UNO R4 WiFi* and the right *Port*. Click **Upload** (→).
6. *Tools → Serial Monitor*: **115200 baud**, line ending **"Newline"**. Type `help`.

> If the Serial Monitor says the WiFi firmware is outdated: *Tools → Firmware Updater* in Arduino IDE 2 updates the board's WiFi chip.

## B. Python backend (and a full run on the simulator)
Install **Python 3.11 or newer** from <https://www.python.org> (Windows: tick **"Add python.exe to PATH"**).

**Windows (PowerShell):**
```powershell
cd DT-smart-system\backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy config.example.yaml config.yaml
python -m pytest -q          # expect: all tests passed
```
**macOS / Linux:** same, but `python3 -m venv .venv`, `source .venv/bin/activate`, `cp` instead of `copy`.

> **ELI5, venv:** a private box of Python packages just for this project, so it can't break (or be broken by) other projects. Activate it in every new terminal (`.venv\Scripts\activate`).

### Your first complete run, no hardware (≈ 10 min)
You need Mosquitto for this (see C.2 to install it). Then open **3 terminals** (each: `cd backend` and activate the venv):
```bash
# Terminal 1: the post office for messages (run from the repo root)
mosquitto -c broker/mosquitto.conf -v

# Terminal 2: create 7 days of FAKE history + train a DRY-RUN model on it
python -m robin --device sim-01 simulate --backfill-days 7
python -m robin --device sim-01 train --allow-synthetic
#   -> prints a comparison table and writes reports/*.png
python -m robin --device sim-01 simulate
#   -> a virtual Robin. Type  d + Enter (dark),  q + Enter (quiet)

# Terminal 3: the system itself, in DEMO mode (it believes it is 03:00)
python -m robin --device sim-01 run --fake-time 03:00 --window-min 2 --check-every 10 --cooldown-min 1
```
Now in terminal 2 type `d` (lights on again), `q` (people move again) and `m` (movement). Within ~30 s terminal 3 logs a negative score, and terminal 2 shows **`SPEAKS #8: "It's the middle of the night..."`**. Type `n`: Robin says it will tell the family, and terminal 3 prints `[caregiver alert]`. That's all 7 components working, on fake data.

⚠️ **Simulated data is for learning the software only.** Requirement 6 demands a model trained on data from *your own* sensor. `train` refuses `sim-*` devices without `--allow-synthetic`, and records `synthetic: true` in the model's metadata.

## C. Network: connect the real robot
### C.1 WiFi: use your phone's hotspot (or home WiFi)
- **eduroam will not work:** it uses a WPA2-*Enterprise* login, which the UNO R4's WiFiS3 library does not support, and university networks often block device-to-device traffic.
- The UNO R4 WiFi only speaks **2.4 GHz**.
  - iPhone: *Settings → Personal Hotspot →* **Maximise Compatibility ON**.
  - Android: *Hotspot → AP band →* **2.4 GHz**.
- Connect the **laptop to the same hotspot**.
- Find the laptop's IP: Windows `ipconfig` (look for *Wireless LAN adapter Wi-Fi → IPv4 Address*), macOS `ipconfig getifaddr en0`.
- Put SSID, password and that IP in `arduino_secrets.h` → upload.
- The IP can change when the hotspot restarts, so **check it before every demo**.

### C.2 Mosquitto (the MQTT broker)
- **Windows:** download the 64-bit installer from <https://mosquitto.org/download/>. The installer may add a Windows *service* that only listens on localhost. Stop it (*Win+R → services.msc → Mosquitto Broker → Stop*, set to *Manual*) and run ours from the repo root:
  ```powershell
  & "C:\Program Files\mosquitto\mosquitto.exe" -c broker\mosquitto.conf -v
  ```
  When Windows Firewall asks, **allow on Private networks**, and make sure the hotspot is set to *Private* (*Settings → Network → Wi-Fi → [hotspot] → Private*).
- **macOS:** `brew install mosquitto`, then `mosquitto -c broker/mosquitto.conf -v`.

**✅ Test:** start the broker. After uploading, the robot's face changes from ✗ eyes to 😊, and the broker log says `New client connected ... as robin-01`.

### C.3 Run the real system
```bash
python -m robin run          # ingest + brain, uses config.yaml (device_id: robin-01)
```
Watch the data: install **MQTT Explorer** (<https://mqtt-explorer.com>, easiest), or `mosquitto_sub -h localhost -t "robin/#" -v`.

### C.4 Troubleshooting the connection
| Serial Monitor says | Meaning | Fix |
|---|---|---|
| `[wifi] failed, will retry` | wrong SSID/password or 5 GHz | check spelling (case-sensitive!), 2.4 GHz |
| `[mqtt] failed, error -1` (timeout) or `-2` (refused) | laptop/broker not reachable | wrong IP; firewall; broker not running; laptop on another network |
| `[mqtt] failed, error 4` or `5` | bad username/password, not authorised | broker needs a password; set it in the secrets or use our config |
| connects, then drops every ~20 s | keep-alive not answered | make sure `mqtt.poll()` isn't blocked (don't add `delay()` in `loop()`) |
| backend: `ConnectionRefusedError` | broker not running on the laptop | start Mosquitto first |

## D. Caregiver phone + handy tools
- **ntfy:** install the *ntfy* app (Android/iOS) and subscribe to a long random topic, e.g. `robin-yourname-7f3kq29x`. Put it in `config.yaml → caregiver.ntfy_topic`. Test from any terminal: `curl -d "Hello from Robin" ntfy.sh/robin-yourname-7f3kq29x`.
- **DB Browser for SQLite** (<https://sqlitebrowser.org>) to look inside `backend/data/robin.db`.
- **VS Code** with the Python extension, for reading and changing the code.
- **Voices:** the MP3s are already in `audio/en` and `audio/nl`. To change a sentence: edit `audio/tracks.yaml`, `pip install piper-tts`, then `python audio/make_audio.py --lang en` (needs ffmpeg for MP3, otherwise it writes WAV, which the module also plays).

## Daily commands (cheat sheet)
| I want to... | Command (in `backend/`, venv active) |
|---|---|
| run everything | `python -m robin run` |
| only collect data | `python -m robin ingest` |
| check data quality | `python -m robin report --hours 24` |
| measure latency | `python -m robin latency --count 50` |
| make Robin speak | `python -m robin cmd "say 3"` |
| train on my data | `python -m robin train` |
| demo mode | `python -m robin run --fake-time 03:00 --window-min 2 --check-every 10 --cooldown-min 1` |
| run the tests | `python -m pytest -q` |
