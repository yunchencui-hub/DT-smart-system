# 09 · Learning guide: understand it well enough to defend it

> The course calls itself *"AI-generation-proof"*: the oral exam checks whether **you** understand your system. This guide turns the project into learning, with ELI5 explanations, self-quizzes (answers hidden), a question bank per rubric criterion, and challenges that make the design *yours*.

## How to use this guide
1. Before each phase in [00_START_HERE.md](00_START_HERE.md), read the matching glossary block.
2. After the phase, do its **checkpoint**: answer out loud, *then* open the answer. If you can't explain it to a friend in 2 minutes, you don't own it yet. Ask me (Claude) to explain it differently.
3. Weekly: fill in [templates/learning_journal.md](templates/learning_journal.md). It becomes the "reflection" section of your Design Notes, and tells you your learning style (Objective A).

---

## Glossary, ELI5 style
### Hardware
| Term | ELI5 | Where in Robin |
|---|---|---|
| **Sensor** | turns something physical (heat, light) into an electrical signal | PIR, LDR |
| **PIR** | a heat "eye" that only notices *change*: a warm body *moving* across its zones | `A1` |
| **ADC** | a ruler with 1024 marks for voltage: 0 V → 0, 5 V → 1023 | `analogRead` |
| **Voltage divider** | two resistors share 5 V between them; when one changes (the LDR), the middle voltage changes | LDR + 10 kΩ |
| **Logic level** | the voltage a chip counts as "1". The UNO R4 needs ≈ 3.5 V+, the PIR gives 3.3 V: that's why we read it as analog | PIR on A1 |
| **Pull-up** | a resistor that gently holds a pin at "1" until a button pulls it to "0" | `INPUT_PULLUP` |
| **Debounce** | metal contacts bounce like a ball for a few ms; we wait 40 ms until they're still | `readButtons()` |
| **UART / serial** | two wires, one to talk (TX) and one to listen (RX), bits at an agreed speed (baud) | Arduino ↔ DFR0534, 9600 baud |
| **Checksum** | a small sum added to a message, so the receiver can spot errors | `voice.h` |

### Communication
| Term | ELI5 | Where |
|---|---|---|
| **MQTT** | a post office. Devices **publish** letters to an address (**topic**); anyone who **subscribed** gets a copy. The post office is the **broker** | Mosquitto |
| **QoS 0 / 1 / 2** | postcard (may get lost) / registered letter (always arrives, maybe twice) / registered with extra paperwork (exactly once, slower) | telemetry 0, events 1 |
| **Retained** | a note pinned on the mailbox, so new visitors see the latest one immediately | `status` |
| **Last Will** | a letter you give the post office in advance: "if I vanish, send this" | `offline` |
| **Keep-alive** | "still here?" pings. No ping for 1.5× the interval = the client is considered dead | 15 s |
| **Latency / RTT** | how long a message takes / there and back again | `latency` tool |
| **Jitter** | how much that time varies | `interval_p95_s` |
| **JSON** | text that looks like a Python dict, readable by humans and computers | payloads |

### Data and ML
| Term | ELI5 | Where |
|---|---|---|
| **Ingestion** | the front door: check who's coming in, keep out junk, write in the guest book | `ingest.py` |
| **Deduplication** | the same letter arrives twice, so only file it once | `UNIQUE(...)` |
| **Feature** | a number that describes a slice of time, e.g. "% of time moving" | `processing.py` |
| **Window** | the slice of time (10 min) we summarise into features | `make_windows` |
| **Cyclical encoding** | time on a clock face (sin/cos), so 23:59 and 00:01 are neighbours | `hour_sin/cos` |
| **z-score** | "how many *typical wobbles* away from average?" 0 = normal, 3+ = very unusual | context features |
| **Anomaly detection** | learn "normal", flag "far from normal" | `model.py` |
| **IsolationForest** | random 20-questions game: weird points are isolated with few questions | deployed model |
| **LOF** | "are my neighbours as close to each other as I am to them?" If you're far from your neighbours, you're an outlier | comparison |
| **Contamination** | how many anomalies the model *expects* in its training data | `--contamination` |
| **False positive / negative** | alarm but nothing wrong / something wrong but no alarm | evaluation |
| **Train / test split** | learn on some days, check on a day the model has never seen | `split_by_day` |

---

## Checkpoints (answer out loud first!)
**Phase 1: hardware**
1. Why does `analogRead` of the PIR give ≈ 675 when it detects movement?
2. What would happen if the LDR and 10 kΩ swapped places?
3. Why is "pressed" LOW for our buttons?
<details><summary>Answers</summary>

1. 3.3 V / 5 V × 1023 ≈ 675.
2. The logic inverts: brighter → *lower* reading. It still works, you'd just flip the interpretation.
3. The internal pull-up holds the pin HIGH; pressing connects it to GND.
</details>

**Phase 2: communication**
1. Why QoS 0 for telemetry but QoS 1 for button events?
2. Robin loses power. Who publishes "offline", and why can Robin not do it itself?
3. QoS 1 can deliver a message twice. Where does Robin handle that?
<details><summary>Answers</summary>

1. A lost 2-s sample is replaced 2 s later; a lost "no, I'm not OK" is not.
2. The broker, using the Last Will registered at connect time. A dead device can't send anything.
3. In the database: `UNIQUE(device, boot, eseq)` + `INSERT OR IGNORE`.
</details>

**Phase 3: data and ML**
1. Why are the features *ratios/rates* and not *counts*?
2. Why did IsolationForest miss night activity before we added z-score features?
3. Why is "no movement for 10 minutes" not an alarm, but "for 3 hours at 10:00" is?
<details><summary>Answers</summary>

1. So they don't depend on window length or data gaps: a 2-min demo window and a 10-min training window are comparable.
2. It splits on one feature at a time; each value alone was normal somewhere in the data; only the combination (movement + 03:00) was rare. z-scores per hour make "unusual for this hour" a single feature.
3. Leaving a room for 10 minutes is normal. The learned per-hour limit (P99 × 1.2 of quiet time) says 3 hours at 10:00 was never seen during normal days.
</details>

---

## Oral-exam question bank (per rubric criterion)
Practise with your duo partner: one asks, one answers, 2 minutes each. **Answer from your own understanding.** The pointer says where to check yourself afterwards.

| Rubric criterion | Questions | Check in |
|---|---|---|
| 1. Sensing part (1–4) | Why a PIR and not a camera or radar? What exactly does the PIR measure? Why sample at 10 Hz but send every 2 s? Why MQTT and not HTTP? What is your measured latency, and what dominates it? What happens with a malformed message? Why SQLite? | 02 §3–4, `report`, `latency` |
| 2. Smart part (5–7) | Which features, and why these? Why unsupervised? Why IsolationForest over LOF, according to *your* numbers? What does contamination do? How do you know it isn't just flagging everything? What's your false-alarm rate per day, and is that acceptable? | 06, `metrics.json` |
| 3. Architecture | Draw the data flow from memory. Where does each decision happen, and why not on the Arduino? What happens when the laptop is off? When the internet is down? | 02 §2 |
| 4. Test objectives | Which risk does each test case address? Why these tolerances? Which component is most critical for the user, and is it tested hardest? | your test plan |
| 5. Test results | What failed? Root cause? Impact on the user? Which improvement did you make, and did you re-test it? | your results |

---

## Make it yours: ownership challenges
Doing some of these gives you *personal* design decisions for the individual Design Notes. Tell me which one you pick and I'll coach you, but you type the code.
| Level | Challenge | Learns |
|---|---|---|
| ⭐ | Add a new reminder (e.g. 18:00 dinner) with a new sentence in `tracks.yaml`; generate the audio | config, TTS pipeline |
| ⭐ | Draw a new face (e.g. "surprised") in `face.h` using the online LED-matrix editor | bitmaps, firmware |
| ⭐⭐ | Calibrate the LDR against a lux-meter app and convert light to lux in `processing.py` | calibration |
| ⭐⭐ | Run the contamination sweep (06 §4) and plot the trade-off curve | model evaluation |
| ⭐⭐ | Add a *daily summary* notification at 20:00 ("3/3 reminders answered, active 9 h") | brain logic, SQL |
| ⭐⭐⭐ | Make the brain event-driven (subscribe to `event` directly) and measure the latency gain | architecture, async |
| ⭐⭐⭐ | Add username/password to Mosquitto (`password_file`) and the robot | security |
| ⭐⭐⭐ | Try a third model (One-Class SVM) in the comparison | ML |

## Which learner are you? (Objective A)
The assignment names three styles: **(1) copy a working design first, then build your own**, **(2) fail forward**, **(3) theory first**. This project starts in style 1: you received a working reference design. Notice how that feels:
- Did understanding come from *reading* the code, *changing* it, or *breaking* it?
- When you got stuck, what helped most: an explanation, an example, or trying things?
- Which topic did you enjoy most (hardware, networking, data, ML)? That's a hint for your "technically-oriented Unique Selling Point".
