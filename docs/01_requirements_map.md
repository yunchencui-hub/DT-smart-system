# 01 · The 7 minimum requirements: what they *really* ask, and how Robin proves each one

> The rubric says: *"If the above conditions are not sufficiently proven based on either the submitted proof or **within 10 minutes during a live demonstration**, then the oral assessment is not to be conducted further."*
> So each requirement must be **working** and **provable fast**. The last column is your proof. [08_demo_script.md](08_demo_script.md) strings these proofs together.

## At a glance

```
 (1) SENSOR        (2) PROTOCOL        (3) INGESTION        (4) STORAGE     (5) PROCESSING      (6) SMART           (7) ACTION
 PIR + LDR +  ──►  MQTT over WiFi ──►  validate + dedup ──► SQLite    ──►  clean + windows ──► IsolationForest ──► Robin speaks,
 buttons           (QoS, LWT)          + weather API                       + features          + learned limit     asks, alerts
 on Arduino                                                                                    (own data!)         caregiver's phone
```

## Requirement by requirement

### 1. At least one hardware sensor measuring a real-time data stream
**Literal text:** *"...The sensing part of your system should not yet have automated data ingestion, storage and/or processing built in. In other words: no smart watches and such."*

**What it implies:**
- You must wire a **raw** sensor to a microcontroller and produce the stream yourself. A finished product with its own app (Fitbit, Hue motion sensor, a smart plug) does not count.
- "Real-time data **stream**": continuous, periodic data, not a single photo or a CSV you download once.
- Examiners will ask *how* the physical event becomes a number (the sensing principle, ADC, calibration).

**Robin:** HC-SR501 PIR (pyroelectric infrared: detects *changes* in heat), GL5528 LDR in a voltage divider (analog 0–1023), two push buttons. Sampled at 10 Hz and summarised every 2 s.

**Proof in the demo:** open the Serial Monitor or `mosquitto_sub`, wave your hand and watch `edges`/`high_ms` rise, cover the LDR and watch `light` drop. About 20 seconds.

**Pitfall:** saying "the PIR measures distance" or "the LDR measures lux". It doesn't: an LDR gives a *relative* brightness unless you calibrate it against a lux meter (a good exploration, see 02).

---

### 2. A real-time method of communication (protocol) between the sensing part and its software counterpart
**Literal text:** *"...When you really struggle ... you are allowed to start out with batch data ingestion."*

**What it implies:**
- A **network protocol** between the device and the software, not "I copy a file from an SD card".
- USB-serial logging to a laptop is weak here. It's a cable, not an IoT protocol; the text names MQTT and OPC UA as examples.
- You must be able to say *why* this protocol fits: latency, reliability, overhead, push vs pull.

**Robin:** **MQTT** over WiFi to a Mosquitto broker on the laptop. Telemetry is QoS 0 every 2 s, button events QoS 1, `online/offline` status is retained, and a **Last Will** makes the broker announce "offline" if Robin dies.

**Proof:** `mosquitto_sub -h 127.0.0.1 -t "robin/#" -v` shows a message every 2 s, and `python -m robin latency` prints the round-trip time.

**Pitfall:** mixing up MQTT QoS levels. QoS 1 means *at least once*, so duplicates are possible, which is why ingestion de-duplicates (a nice link to requirement 3).

---

### 3. A data ingestion component (API batch / streaming) to extract data from **different sources** into your database
**What it implies:**
- A distinct piece of software whose job is *getting data in*: subscribe, parse, validate, store.
- **"Different sources" (plural)**: Robin has a **streaming** source (MQTT sensor data) *and* a **batch API** source (Open-Meteo weather every 30 min). That covers both examples in the text.
- Quality matters: what happens with a broken message, a duplicate, a message from an unknown device?

**Robin:** `backend/robin/ingest.py` + `weather.py`. It validates every message (types, ranges), drops duplicates via `UNIQUE(device, boot, seq)`, and sends bad messages to a `rejects` table instead of crashing.

**Proof:** `python -m robin report --hours 1` shows messages, loss %, rejects and weather rows. Or send a bad message live:
`mosquitto_pub -t robin/robin-01/telemetry -m "garbage"`, then the report shows `rejected_messages: 1`.

---

### 4. A storage component
**Literal text:** *"...Differs between temporary storage (for raw sensor data) up to data warehouses for AI training sets."*

**What it implies:** the complexity should fit your system, and you must defend the choice.

**Robin:** one **SQLite** file (`data/robin.db`, WAL mode) with raw tables (`telemetry`, `events`, `status`, `weather`) and derived tables (`scores`, `actions`, `rejects`). It holds 43,200 telemetry rows per day, which is trivial for SQLite. The same file serves as the **training set** (requirement 6) and as the **audit log** of every decision (requirement 7).

**Proof:** open the file in [DB Browser for SQLite](https://sqlitebrowser.org/) and show the rows growing, or run `python -m robin report`.

---

### 5. A processing component that converts, cleans, scales, prepares your data
**Robin:** `backend/robin/processing.py`
| Verb from the assignment | What Robin does |
|---|---|
| **cleans** | removes duplicates, PIR warm-up rows (first 60 s after boot), impossible values (`high_ms` longer than sampled) |
| **converts** | raw ADC 0–1023 → light %, PIR HIGH-time → fraction of time moving, edges → movements per minute |
| **prepares** | groups 2-second messages into 10-minute windows, drops windows with < 50% data (gaps), encodes time of day as sin/cos (so 23:59 is next to 00:01), computes "minutes since last movement" |
| **scales** | z-scores per hour of day (context features); StandardScaler for the LOF comparison model |

**Proof:** `python -m robin train` prints "N messages → M windows". Show the `hourly_profile.png` it creates.

---

### 6. A smart algorithm trained (partially) on historical data **from your own hardware sensor (important!)**
**This is the most commonly misread requirement.**
- ❌ Training only on a Kaggle / public dataset: not your sensor.
- ❌ Training on the simulator's data: not your sensor. (`python -m robin train` refuses simulated devices on purpose.)
- ✅ Record **your own** days with **your own** Robin, then train on that. A public dataset may *complement* it ("partially").
- "Smart" can be simple, even "a periodically reviewed threshold". What matters is that you **learned it from your data** and can **evaluate** it.

**Robin:** two detectors learned from ≥ 7 days of your own recordings:
1. **IsolationForest** on (movement, movement rate, light, time of day + "how unusual for this hour") catches *unusual activity right now*, e.g. lights and movement at 03:00.
2. A **learned inactivity limit per hour** catches *no movement for far longer than usual*, e.g. 3 h at 10:00.
It's compared against LocalOutlierFactor and a plain z-score baseline, evaluated on a held-out day, on injected anomalies, and on anomalies you staged yourself.

**Proof:** `reports/metrics.json` (shows `device: robin-01` and the date range of YOUR data), the comparison table, the plots, and a live check-in in the demo.

---

### 7. An autonomous action or output beyond passive monitoring / dashboards
**Literal text:** *"Your smart system may adjust a setting in real-time, trigger an order, or activate an autonomous response. Just mainly go beyond passive monitoring and (dashboard) visualization."*

**Robin has no dashboard at all.** Everything it does is an action:
- **Speaks** reminders *only when someone is in the room* (presence-aware, unlike Tessa's fixed time).
- **Asks** "Are you alright?" when the model sees something unusual, and **escalates** to the caregiver's phone (ntfy push) on a red press or no answer.
- **Changes its face** (LED matrix) and **alerts** when it goes offline itself.

**Proof:** the night check-in demo: Robin speaks, you press red, the phone buzzes. About 2 minutes.

---

## Knock-out self-check (tick before every demo)
- [ ] 1. Sensor values change live when I wave / cover the LDR
- [ ] 2. `mosquitto_sub` shows messages every 2 s; latency tool works
- [ ] 3. Ingest log shows "telemetry" counts; weather rows present; a garbage message is rejected
- [ ] 4. Database has ≥ 7 days of my own data
- [ ] 5. Training prints windows; hourly profile plot exists
- [ ] 6. `metrics.json` says `device: robin-01`, `synthetic: false`; model file exists
- [ ] 7. Robin speaks, asks, and the caregiver phone receives an alert
