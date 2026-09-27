# 07 · Test plan: framework, tools and one worked example

> **What's graded:** your *test objectives* (rubric criterion 4) and how well you *use results* (criterion 5). The test plan covers **components 1–4** (sensor, protocol, ingestion, storage), and **another duo executes it**, so it must be followable by strangers.
> **What I give you:** the structure, the risks to think about, measurement tools, and **one worked example on a component *outside* 1–4**, so you see the pattern. **You and your duo partner write the actual test cases.** That's the part you must defend orally, so it has to be your thinking.

## 1. The structure the assignment expects (per test case)
| Field | Meaning | Tip |
|---|---|---|
| ID + title | TC-01 … | one behaviour per test case |
| Objective | *why* this matters, linked to a system risk | "If X fails, then Y happens to the user" |
| What is tested | component + property | e.g. "sensor: detection distance" |
| How (method, tools, duration) | step-by-step, so a stranger can repeat it | exact commands, distances, how many repetitions |
| Expected result | **measurable** pass criterion | numbers + units + tolerance ("≥ 95% of 20 trials") |
| Actual result & notes | filled in by the *test team* | raw numbers, photos, surprises |
| Pass / Fail | | + what you'll improve if it fails |

Measurable objective example from the assignment: *"The sensor should detect temperature within ±1°C accuracy and transmit data every 2s with <200ms latency."*

## 2. Test levels (from the assignment's tips)
1. **Unit:** one component alone (e.g. only the LDR with the `raw` command, no WiFi).
2. **Integration:** two parts together (robot → broker → ingest → database).
3. **Stress:** push it (many messages, long runtime, weak WiFi, many button presses quickly).
4. **Scenario / edge cases:** unplug things. Does it fail *gracefully*, with a clear message, or crash silently?

## 3. Risks to cover (turn each into ≥ 1 objective yourself)
Think about what could go wrong **for Mrs. Jansen** if each component misbehaves.

**Component 1: sensors**
- The PIR misses movement (range, angle, someone moving slowly) → reminders never delivered.
- The PIR triggers without a person (warm-up, heater, sunlight) → false "presence".
- The LDR's value depends on angle/distance to the lamp; the values of two LDRs differ.
- A button press isn't registered, or one press counts twice (bounce).

**Component 2: communication**
- Messages arrive late (latency) or not at all (loss), especially with weak WiFi.
- Messages arrive twice (QoS 1).
- Robot disconnects: does the system notice? How fast? (Last Will, keep-alive 15 s)
- Button pressed while offline: does the answer still arrive?

**Component 3: ingestion**
- Malformed / incomplete / out-of-range message.
- Duplicates.
- Data from an unknown device or topic.
- Weather API down or slow.

**Component 4: storage**
- Data complete over a long run (no silent gaps)?
- Survives a laptop / backend restart without losing or duplicating data?
- Timestamps correct (events that waited in the offline queue)?
- Reading (brain) while writing (ingest) at the same time?

## 4. Tools you can hand to the test team
| Tool | Measures | Command |
|---|---|---|
| `raw` (Serial Monitor) | live raw ADC values of PIR and LDR, button state | type `raw` |
| `report` | messages, lost messages (seq gaps), loss %, interval median/p95/max, samples per message, reboots, rejects, RSSI | `python -m robin report --hours 1` |
| `latency` | round-trip time robot ↔ laptop (min/median/p95/max) + lost pings, saved as CSV | `python -m robin latency --count 100` |
| `mosquitto_sub` / MQTT Explorer | see every message live, incl. status and Last Will | `mosquitto_sub -h localhost -t "robin/#" -v` |
| `mosquitto_pub` | inject a malformed message | `mosquitto_pub -t robin/robin-01/telemetry -m "garbage"` |
| DB Browser for SQLite | inspect the tables | open `backend/data/robin.db` |
| `pytest` | automated unit tests of ingestion/processing (show as supporting evidence) | `python -m pytest -q` |

## 5. Worked example (component 5, processing, NOT part of your plan)
This shows the level of detail. Copy the *pattern*, not the content.

| Field | TC-X · PIR warm-up data is excluded from the training set |
|---|---|
| **Objective** | After power-up a PIR outputs random HIGH/LOW for ~60 s. If these rows reach the model, every reboot looks like "activity", which biases the learned routine and can hide real inactivity. |
| **What** | Processing component, `clean()` warm-up filter |
| **How** | 1. Start `python -m robin ingest`. 2. Unplug Robin for 10 s and plug it back in (a new `boot` id). 3. Stand still out of the PIR's view for 2 min. 4. Run `python -m robin report --hours 0.1` and note `reboots`. 5. In DB Browser run `SELECT dev_ms, pir, edges FROM telemetry WHERE boot=(SELECT boot FROM telemetry ORDER BY ts DESC LIMIT 1) ORDER BY seq LIMIT 40;` and count rows with `dev_ms < 60000` that show `edges > 0`. 6. Run `python -m pytest tests/test_processing.py -k warmup -q`. Repeat steps 2–5 three times. |
| **Expected** | `reboots` = 1 per replug; raw rows with `dev_ms < 60000` may contain edges (that's the problem being tested); the unit test passes, proving those rows are removed before windowing; no windows are built from the first 60 s. |
| **Actual & notes** | *(test team fills in: numbers per repetition, screenshot)* |
| **Pass/Fail** | Pass if all 3 repetitions behave as expected. |

Notice: a **why** (risk), a **repeatable procedure** with exact commands, a **numeric** expectation, and **repetitions**.

## 6. Being the test team for another duo (compulsory!)
- Read their plan *before* the session and ask for anything missing (IP, broker, commands).
- Follow it literally. If a step is ambiguous, write down what you did instead: that's useful feedback.
- Record **raw numbers**, not just "OK". Photos and screenshots help.
- Be on time: not executing the other duo's tests can be a **knock-out**.

## 7. After you get your results back
For each **fail** or **surprise**: *cause → impact on the user → technical improvement → re-test*. That's rubric criterion 5 at level 5. Example of the reasoning pattern (on a different topic): *"Ping p95 was 900 ms on the hotspot vs 40 ms at home → cause: phone hotspot power saving → impact: 'yes' answers may take a second longer to register → improvement: none needed (budget is 4 s), but we documented it."*

Use [templates/test_plan_template.md](templates/test_plan_template.md) for your own cases.
