# Robin: a routine-aware care robot (inspired by Tinybots' Tessa)

*Course project, Digital Designs and Applications (DT master, Fontys), tech-push duo.*

Robin is a small tabletop robot for older people who live alone. Like [Tessa](https://www.tinybots.nl/zorgrobot-tessa/werking), it speaks friendly reminders and asks yes/no questions. Unlike Tessa, it has **senses and a memory**:

- 🟢 **Presence-aware reminders:** it speaks when someone is actually in the room (PIR), and reports "missed" if nobody came.
- 🧠 **Learns the daily routine** from its *own* sensor data (movement + light) and notices unusual situations: lights and movement at 03:00, or no movement for hours when you are normally active.
- 🗣️ **Asks before it alerts:** "Is everything alright?" Green = fine; red or no answer = push alert to the family, with an explanation.
- 🌡️ **Context:** an extra water reminder on hot days (Open-Meteo API).

## How it meets the 7 minimum requirements
| # | Requirement | Robin |
|---|---|---|
| 1 | Hardware sensor, real-time stream | PIR (HC-SR501) + LDR + 2 buttons on an Arduino UNO R4 WiFi, sampled at 10 Hz |
| 2 | Real-time protocol | MQTT over WiFi (Mosquitto): QoS 0/1, retained status, Last Will |
| 3 | Ingestion from different sources | MQTT stream + Open-Meteo API, with validation, de-duplication and a rejects table |
| 4 | Storage | SQLite (WAL): raw, derived and audit tables |
| 5 | Processing | cleaning, conversion, 10-min feature windows, cyclical time, z-score context |
| 6 | Smart algorithm on own data | IsolationForest + learned per-hour inactivity limit, compared with LOF + baseline |
| 7 | Autonomous action | speaks/asks via an MP3 voice module, LED-matrix face, caregiver push alerts (ntfy) |

Details: [docs/01_requirements_map.md](docs/01_requirements_map.md)

## Budget
**€39.00 incl. VAT and shipping** (Tinytronics, prices checked 24 Sep 2026), or €30.95 if Pulsed supplies breadboard/wires/resistors. See [docs/03_shopping_list.md](docs/03_shopping_list.md).

## Quick start (no hardware needed)
```bash
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt && cp config.example.yaml config.yaml
python -m pytest -q                                     # 36 tests
mosquitto -c ../broker/mosquitto.conf -v &              # the MQTT broker
python -m robin --device sim-01 simulate --backfill-days 7
python -m robin --device sim-01 train --allow-synthetic
python -m robin --device sim-01 simulate &              # a virtual robot
python -m robin --device sim-01 run --fake-time 03:00 --window-min 2 --check-every 10 --cooldown-min 1
```
Full guide: [docs/05_software_setup.md](docs/05_software_setup.md). **Start with [docs/00_START_HERE.md](docs/00_START_HERE.md).**

## Repository layout
```
docs/                 roadmap, design, shopping list, assembly, setup, ML, test plan, demo, learning guide
firmware/robin/       Arduino sketch: sensors, MQTT, voice driver, LED faces
backend/robin/        Python: ingest, db, weather, processing, model, train, brain, notify, simulate, tools
backend/tests/        pytest suite (ingestion, processing, model, brain, weather)
audio/                sentences (tracks.yaml), generator (Piper TTS), ready-made MP3s (en, nl)
broker/               Mosquitto config
CLAUDE.md             project memory for AI-assisted sessions
```

## Credits
- DFR0534 serial protocol: reference implementation [codingABI/DFR0534](https://github.com/codingABI/DFR0534) (BSD-2-Clause); our `voice.h` is a minimal re-implementation.
- Voices generated with [Piper](https://github.com/OHF-Voice/piper1-gpl): `en_GB-cori-high` (trained on public-domain LibriVox recordings) and `nl_NL-ronnie-medium` (CC0 dataset, fine-tuned from the Lessac voice, whose dataset is licensed for non-commercial research). Fine for this course project; check before any commercial use.
- Concept inspiration: Tinybots' Tessa. This is an independent student prototype, not affiliated with Tinybots.
