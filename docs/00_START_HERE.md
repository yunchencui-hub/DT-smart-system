# 00 · Start here: the roadmap

Hi partner 👋 This folder is our project manual. Read the files in number order when the roadmap tells you to; you don't need everything at once.

| File | What | Read when |
|---|---|---|
| **00_START_HERE** | this roadmap | now |
| [01_requirements_map](01_requirements_map.md) | the 7 knock-outs: what they really ask + our proof | now |
| [02_design](02_design.md) | architecture, choices, trade-offs, ethics | week 1, then re-read before the oral |
| [03_shopping_list](03_shopping_list.md) | verified parts list (€42.90, updated 30 Sep) + purchase-request email | **week 1** |
| [04_assembly](04_assembly.md) | wiring, step by step with a test after each step | when the parts arrive |
| [05_software_setup](05_software_setup.md) | install + run (incl. the simulator, no hardware needed) | **week 1** |
| [06_data_and_ml](06_data_and_ml.md) | collecting your data, training, tuning | before data collection |
| [07_test_plan](07_test_plan.md) | how to write and run the test plan | while data is being collected |
| [08_demo_script](08_demo_script.md) | the 10-minute knock-out demo + proof video | final weeks |
| [09_learning_guide](09_learning_guide.md) | glossary, self-quizzes, oral-exam practice, challenges | every phase |
| [templates/](templates/) | Design Notes prompts, test plan table, learning journal | when needed |
| [../video-remotion/](../video-remotion/README.md) | build-guide video that follows 04 step by step (30 Sep parts, safety-reviewed), with chapters | before you wire, then per step |
| [../video/](../video/README.md) | older 32-min animated guide (idea → build → Robin at work); its voice-module wiring is outdated | for the idea and "Robin at work" parts |

## The plan (adjust the weeks to your course calendar)

### Phase 0: kick-off (week 1)
- [ ] **Register the concept**: Tessa is idea #12 and ideas are first-come. Add your duo names to the overview, and tell the lecturer our strong deviation: *presence-aware reminders + learning the daily routine*.
- [ ] Ask the DT guide: is our board an **Arduino UNO R4 WiFi**? (If not, tell me and I'll adapt the firmware.)
- [ ] Ask Pulsed which common parts they have (breadboard, jumper wires, resistors, LDR, buttons), then choose budget scenario A or B in 03.
- [ ] Send the purchase request (03).
- [ ] **Register for the test in Progress** (the assignment reminds you!).
- [ ] Install Python + Mosquitto and do the **simulator run** (05 part B). You'll see all 7 components working today.
- [ ] Read 01 and 02; glossary "Hardware" + "Communication" in 09.

### Phase 1: hardware (when the parts arrive, ≈ week 2–3)
- [ ] Upload the firmware in offline test mode (05 part A).
- [ ] 04 steps 1–6, each with its ✅ test. Take photos along the way (proof package!).
- [ ] 🔬 PIR timing + LDR calibration explorations (02 §3). Write the numbers in your journal.
- [ ] Checkpoint "Phase 1" in 09.

### Phase 2: connect (≈ week 3)
- [ ] Hotspot + Mosquitto + firewall (05 part C). Face turns 😊.
- [ ] `report`, `latency`, and unplug Robin to see the Last Will (02 §4 🔬).
- [ ] ntfy on your phone (05 part D).
- [ ] Checkpoint "Phase 2".

### Phase 3: collect YOUR data (≥ 7 days, ≈ week 4–5)
- [ ] Robin at home, laptop never sleeps, `python -m robin run` (06 §2).
- [ ] Every evening: `report` screenshot + a diary line.
- [ ] Stage 2–3 anomalies and write them in `data/labels.csv`.
- **Meanwhile:** write your test objectives + test cases (07), build the body (04 step 8), and start your Design Notes skeleton (templates).

### Phase 4: train and tune (≈ week 6)
- [ ] `python -m robin train`, then LOF, then the contamination sweep (06 §3–4).
- [ ] Decide the deployed settings and write down *why* (numbers!).
- [ ] Checkpoint "Phase 3".

### Phase 5: test exchange (≈ week 6–7)
- [ ] Hand your test plan to the other duo; execute theirs on time (knock-out risk!).
- [ ] Results back → cause → impact → improvement → re-test (07 §7).

### Phase 6: wrap-up (final weeks)
- [ ] Rehearse the demo 3× with a timer (08). Record the proof video + photos.
- [ ] Write your **individual** Design Notes (≤ 5 pages, your own words).
- [ ] Oral practice with the question bank (09).
- [ ] Submit on Gradework: proof (files, not links), test plan + results, Design Notes.

## Working as a duo
The course pairs you with a human partner, and the Design Notes must show *individual* contributions. A split that gives you both something to be proud of:
- **Partner A, sensing (components 1–4):** wiring, firmware, MQTT, ingestion, storage, test plan for 1–4.
- **Partner B, smart (components 5–7):** processing, model, evaluation, brain, notifications.
- **Together:** data collection, test exchange, demo. **Once a week, explain your half to the other** (the oral exam can ask either of you anything).

## Working with me (Claude) in later sessions
Open a session in this repository: I'll read `CLAUDE.md` (our project memory) first. Then tell me:
1. which phase you're in, 2. what you tried, 3. the exact error or output (copy-paste, or a photo of the wiring).
I'll explain, debug with you, and update the memory file. I won't write your Design Notes or your test cases, but I'll coach you through them. That's what protects you at the oral exam.
