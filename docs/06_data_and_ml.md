# 06 · Data collection and the smart algorithm

## 1. ELI5: what does Robin learn?
Imagine you visit grandma every day for two weeks and keep a notebook: *"08:00 kitchen busy, lights on at 18:00, quiet at 03:00..."*. After two weeks you just *know* her rhythm. If one day at 10:00 the house is silent for three hours, or the lights are on at 03:00, you feel "hmm, that's odd". **Robin's model is that notebook plus that feeling**, written in numbers.

- **Normal** = what the robot saw most of the time *at that hour* during the recording weeks.
- **Anomaly** = a window that is far away from normal.
- Robin never "knows" someone fell. It only knows "this is unusual", and then it **asks** before it alerts. That's why the design is *ask first, alert second*.

### The two detectors in one picture
```
 every minute:  last 10 min of data ──► features ──┬──► IsolationForest ──► "unusual NOW?"      (e.g. lights + moving at 03:00)
                                                   └──► learned limit    ──► "quiet TOO LONG?"   (e.g. no movement 3 h at 10:00)
                                                              │
                                              either one = check-in: "Are you alright?"
```

**ELI5 IsolationForest:** play "20 questions" with random yes/no splits ("is light > 40%?", "is it after 22:00?"). A *normal* window looks like hundreds of others, so it takes many questions to isolate it. A *weird* window is alone in its corner, so a few questions isolate it. **Few questions = anomaly.** It builds 200 such random trees and averages them.

**Why it needed help (a story for your oral exam):** our first version fed the forest only *raw* values + time of day. In our tests it **missed night wandering**, because "40% movement" is normal (by day) and "03:00" is normal (at night); only the *combination* is weird. The forest asks about one feature at a time, so it struggled. Fix: we added two **context features**, "how many standard deviations is movement / light away from what's usual *for this hour*?". Night wandering then gets a z-score of 10+ and is caught at once. (Classic trick: turn a *contextual* anomaly into a *point* anomaly.)

**Why a separate inactivity rule?** Ten quiet minutes are normal (people leave the room). Danger is *hours* of quiet at a time you're normally active. So we compute "minutes since the last movement" and learn, per hour, the longest quiet period that is still normal (99th percentile × 1.2, at least 30 min). Longer than that = alarm. It's a threshold *learned from your data*, reviewed each time you retrain: exactly the "periodically reviewed threshold" the assignment mentions, but data-driven.

## 2. Collecting YOUR data (requirement 6)
**Goal:** at least **7 full days** (better 10–14) of Robin living somewhere real, with you living your normal life.

**Setup at home**
- [ ] Put Robin where life happens (living room or kitchen), PIR pointing into the room, **not** at a window, heater or pet bed (PIRs see heat changes).
- [ ] Robin on a USB phone charger. Laptop: plugged in, **sleep disabled** (Windows: *Settings → System → Power → Screen and sleep → Never* when plugged in).
- [ ] Laptop runs Mosquitto + `python -m robin run` (or `ingest` only) the whole time.
- [ ] Every evening: `python -m robin report --hours 24`. You want `loss_pct` < 2%, `samples_per_msg_mean` ≈ 20, `reboots` ≈ 0. Screenshot it: that's test evidence for your test plan.

**Keep a short diary** (a note on your phone): visitors, parties, days away, the laptop crashing. It explains strange data later.

**Stage a few anomalies, safely, and write them down** in `backend/data/labels.csv`:
```csv
start,end,label
2026-10-12 10:00,2026-10-12 13:00,staged_inactivity
2026-10-14 03:10,2026-10-14 03:30,staged_night_activity
```
- *Inactivity:* leave the room (or the house) for 3 hours at a time you're normally home and active.
- *Night activity:* set an alarm, get up at 03:00, lights on, walk around in front of Robin for 15 min.
- Labelled windows are **removed from training** (they're not normal) and **used as a real test** in the evaluation table (`detect_staged_real`).

> **Ethics check:** if you record in a shared house, tell your housemates what Robin measures (only movement and light, no camera, no audio) and ask if they're OK with it. That's informed consent in practice.

## 3. Train and evaluate
```bash
python -m robin train                        # IsolationForest, 10-min windows, 1 held-out day
python -m robin train --algorithm lof        # try the other model
python -m robin train --contamination 0.01   # fewer alarms, but maybe misses more
```
It prints a table like this. **These numbers come from SIMULATED data** (7 days, `sim-01`), so yours will be different and messier, and that's fine:

| detector | false_alarm_rate | detect_night_activity | detect_3h_inactivity |
|---|---|---|---|
| iforest_only | 0.008 | 1.0 | 0.106 |
| lof_only | 0.04 | 0.833 | 0.061 |
| hourly_zscore | 0.0 | 1.0 | 0.091 |
| inactivity_rule | 0.0 | 0.0 | 1.0 |
| **DEPLOYED (iforest + rule)** | **0.008** | **1.0** | **1.0** |

**How to read it:**
- `false_alarm_rate`: share of *normal* windows (a day the model never saw) flagged as unusual. 0.008 × 144 windows/day ≈ **1 unnecessary check-in per day**. Is that acceptable for Mrs. Jansen? (The one-per-hour cooldown limits nagging. Discuss!)
- `detect_*`: share of injected anomalies caught. Injected = real held-out windows, changed to look like the anomaly.
- Each detector is good at one thing, and the **combination** covers both risks. That's your main design argument, backed by numbers.
- Files: `reports/metrics.json` (all numbers + the learned inactivity limits per hour), `reports/hourly_profile.png` (what a normal day looks like), `reports/test_scores.png` (score over the held-out day).

## 4. Tuning knobs (and what they trade)
| Knob | Where | ↑ means | Trade-off |
|---|---|---|---|
| `contamination` | `train --contamination` | expects more anomalies | more alarms (false positives) vs fewer misses |
| `window_min` | config `anomaly.window_min` | longer windows | calmer, fewer false alarms, but slower detection |
| `INACTIVITY_QUANTILE`, `INACTIVITY_MARGIN` | `model.py` | higher limit | fewer inactivity alarms, later detection |
| `cooldown_min` | config | fewer check-ins | less nagging, but a second real problem waits longer |
| `answers.timeout_s`, `repeats` | config | more patience | kinder for slow users, slower escalation |

🔬 **Explore:** train with contamination 0.005 / 0.01 / 0.02 / 0.05 and plot false-alarm rate against detection rate. That little curve is a great figure for your Design Notes and for rubric criterion 2 ("what model best deals with given data characteristics").

## 5. Retraining ("periodically reviewed")
Routines change (seasons, a new hobby). Retrain weekly:
`python -m robin train`. The running brain **reloads the new model automatically** (it watches the file's timestamp).
Before replacing a model, compare the new `metrics.json` with the old one. Never deploy a model whose false-alarm rate got much worse.

## 6. Honest limitations (say them before the examiner does)
- 1–2 weeks is a small dataset, so weekends and rare events are under-represented.
- Evaluating with injected anomalies measures "can it see *this kind* of change", not real-world accuracy. Your staged anomalies are better evidence; real incidents would be best (and are rare, luckily).
- Unsupervised = no ground truth. The model finds *unusual*, not *dangerous*. That's why a human (the person, then the caregiver) stays in the loop.
