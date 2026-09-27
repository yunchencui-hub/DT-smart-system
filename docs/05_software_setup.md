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
1. Install **Arduino IDE 2** from <https://www.arduino.cc/en/software>. (If it opens in another language: *File → Preferences → Language → English*, so the menu names below match.)
2. *Tools → Board → Boards Manager*: install **"Arduino UNO R4 Boards"**.
3. *Tools → Manage Libraries*: install **ArduinoMqttClient** (by Arduino). That's the only extra library: the voice driver (`voice.h`) and faces (`face.h`) are in our own sketch, and WiFiS3 + LED matrix come with the board package.
4. In the folder `firmware/robin/`, copy `arduino_secrets.example.h` to **`arduino_secrets.h`**. For the first tests leave `SECRET_WIFI_SSID ""` (offline test mode).
5. Open `firmware/robin/robin.ino`. Choose *Tools → Board → Arduino UNO R4 WiFi* and the right *Port*: plug the board in and pick the port labelled **Arduino UNO R4 WiFi** (other COM ports, e.g. "Standard Serial over Bluetooth link", are not the board). Click **Upload** (→).
6. *Tools → Serial Monitor*: **115200 baud**, line ending **"Newline"**. Type `help`.

> If the Serial Monitor says the WiFi firmware is outdated: *Tools → Firmware Updater* in Arduino IDE 2 updates the board's WiFi chip.

## B. Python backend (and a full run on the simulator)
Install **Python 3.11 or newer** from <https://www.python.org> (Windows: tick **"Add python.exe to PATH"**).

**Windows (PowerShell):**
```powershell
cd <your clone>\backend      # e.g. cd E:\DT-smart-system\backend
python -m venv .venv
.venv\Scripts\activate       # the prompt now starts with (.venv)
pip install -r requirements.txt
if (-not (Test-Path config.yaml)) { copy config.example.yaml config.yaml }   # first time only: keeps your edits
python -m pytest -q          # expect: all tests passed
```
> **`config.yaml` made before 27 Sep 2026?** Set `anomaly.model_path: models/anomaly-{device}.joblib` and `mqtt.host: 127.0.0.1` in it (compare with `config.example.yaml`). Until then, `train` stops rather than let the simulator overwrite your robot's model.
**macOS / Linux:** same, but `python3 -m venv .venv`, `source .venv/bin/activate`, and `cp -n` instead of the `copy` line.

> **ELI5, venv:** a private box of Python packages just for this project, so it can't break (or be broken by) other projects. Activate it in every new terminal (`.venv\Scripts\activate`) and check that the prompt shows **(.venv)**. Without it, `python` is your global Python, with other package versions (or none).

> **Windows says "running scripts is disabled on this system"?** Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once (no admin needed), then activate again. Or skip activating and type `.venv\Scripts\python -m robin ...` instead of `python -m robin ...`.

### Your first complete run, no hardware (≈ 10 min)
You need Mosquitto for this (see C.2 to install it). Then open **3 terminals**:
- **Terminal 1** stays in the **repo root** (no venv needed): it only runs the broker.
- **Terminals 2 and 3:** `cd backend` and activate the venv.
```bash
# Terminal 1 (repo root): the post office for messages. Stop it later with Ctrl+C.
mosquitto -c broker/mosquitto.conf -v
#   Windows: "mosquitto is not recognized"? The installer does not add itself to PATH. Use the full path:
#   & "C:\Program Files\mosquitto\mosquitto.exe" -c broker\mosquitto.conf -v
#   (or add C:\Program Files\mosquitto to your user PATH once, then open a NEW terminal)

# Terminal 2: create 7 days of FAKE history + train a DRY-RUN model on it
python -m robin --device sim-01 simulate --backfill-days 7
python -m robin --device sim-01 train --allow-synthetic
#   -> prints a comparison table, writes models/anomaly-sim-01.joblib and reports/sim-01/*.png
#      (simulator results never touch your robot's model or reports)
python -m robin --device sim-01 simulate
#   -> a virtual Robin. Keys (+ Enter): m = movement for 30 s, d = dark on/off, q = quiet on/off, y/n = buttons

# Terminal 3: the system itself, in DEMO mode (it believes it is 03:00)
python -m robin --device sim-01 run --fake-time 03:00 --window-min 2 --check-every 10 --cooldown-min 1
```
Now in terminal 2 type `m` (movement in the middle of the night) and repeat it every ~30 s. The first score appears after about a minute (the brain needs about a minute of data in its 2-minute window). Then terminal 3 logs a **negative** score, and terminal 2 shows **`SPEAKS #8: "It's the middle of the night..."`**. Type `n`: Robin says it will tell the family, and terminal 3 prints `[caregiver alert]`. That's all 7 components working, on fake data.

> 📱 If your ntfy topic is already in `config.yaml` (part D), this demo sends **real pushes**: `n` (or no answer) an alert, `y` a low-priority info message. Subscribe first to see them, or set `ntfy_topic: ""` while rehearsing.

⚠️ **Simulated data is for learning the software only.** Requirement 6 demands a model trained on data from *your own* sensor. `train` refuses `sim-*` devices without `--allow-synthetic`, and records `synthetic: true` in the model's metadata and in `metrics.json`. The brain only uses a model trained on its **own** device: your robot (`robin-01`) never uses the simulator's model.

## C. Network: connect the real robot
### C.1 WiFi: use your phone's hotspot (or home WiFi)
- **eduroam will not work:** it uses a WPA2-*Enterprise* login, which the UNO R4's WiFiS3 library does not support, and university networks often block device-to-device traffic.
- The UNO R4 WiFi only speaks **2.4 GHz**.
  - iPhone: *Settings → Personal Hotspot →* **Maximise Compatibility ON**.
  - Android: *Hotspot → AP band →* **2.4 GHz**.
- Connect the **laptop to the same hotspot**.
- Find the laptop's IP: Windows `ipconfig` (look for *Wireless LAN adapter Wi-Fi* (on some Windows versions *WLAN*) *→ IPv4 Address*), macOS `ipconfig getifaddr en0`.
- Put SSID, password and that IP in `arduino_secrets.h` → upload.
- The IP can change when the hotspot restarts, so **check it before every demo**.

### C.2 Mosquitto (the MQTT broker)
- **Windows:** download the 64-bit installer from <https://mosquitto.org/download/>. The installer may add a Windows *service* that only listens on localhost. Stop it (*Win+R → services.msc → Mosquitto Broker → Stop*, set to *Manual*) and run ours from the repo root:
  ```powershell
  & "C:\Program Files\mosquitto\mosquitto.exe" -c broker\mosquitto.conf -v
  ```
  When Windows Firewall asks, tick **Private networks only** and **untick Public** (the popup pre-ticks the type of the network you are on right now; Public would let strangers on café/campus WiFi use our password-less broker). Then set the network the robot uses to *Private*: the phone hotspot, or your home WiFi (*Settings → Network & internet → Wi-Fi → [network] → Network profile type → Private*). Windows marks every new network Public, so do this the first time you join the hotspot.
  Already clicked *Allow* with **Public** ticked? Undo it: *Windows Security → Firewall & network protection → Allow an app through firewall → Change settings →* untick **Public** for every *mosquitto* line.
  Stop the broker with **Ctrl+C** in its window: that also saves the robot's retained online/offline status.
- **macOS:** `brew install mosquitto`, then `mosquitto -c broker/mosquitto.conf -v`.

**✅ Test:** start the broker. After uploading, the robot's face changes from ✗ eyes to 😊, and the broker log says `New client connected ... as robin-01`.

### C.3 Run the real system
```bash
python -m robin run          # ingest + brain, uses config.yaml (device_id: robin-01)
```
Until you have trained a model on your own data (`python -m robin train`, see 06), the brain says *"No trained model at …\models\anomaly-robin-01.joblib yet"*: reminders work, anomaly check-ins are off. That is expected, and it never falls back to the simulator's model.
Watch the data: install **MQTT Explorer** (<https://mqtt-explorer.com>, easiest), or `mosquitto_sub -h 127.0.0.1 -t "robin/#" -v`.

### C.4 Troubleshooting the connection
| Serial Monitor says | Meaning | Fix |
|---|---|---|
| `[wifi] failed, will retry` | wrong SSID/password or 5 GHz | check spelling (case-sensitive!), 2.4 GHz |
| `[mqtt] failed, error -1` (timeout) or `-2` (refused) | laptop/broker not reachable | wrong IP; firewall; broker not running; laptop on another network |
| `error -2` (or `-1`), and the laptop's WiFi is *Public* | the firewall only lets the robot in on *Private* networks | set that network to Private (C.2) |
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
| any of these against the **simulator** | put the device right after `robin`: `python -m robin --device sim-01 latency --count 20` |
