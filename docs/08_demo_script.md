# 08 · The 10-minute knock-out demo (and the proof video)

> The examiners must see all 7 components work **within 10 minutes**, or the oral assessment stops. Rehearse this script at least **3 times**, with a timer. Record one perfect run: it's also your **proof video** for Gradework (upload the file itself, not a link).

## 30 minutes before: checklist
- [ ] Phone charged; hotspot ON, **2.4 GHz / Maximise Compatibility**; laptop joined to it.
- [ ] Laptop IP unchanged? (`ipconfig`). If it changed: edit `arduino_secrets.h` and upload again.
- [ ] Terminal 1: `mosquitto -c broker/mosquitto.conf -v`
- [ ] Terminal 2: `python -m robin ingest` (data flows into the database from now on)
- [ ] Terminal 3: **typed but NOT started yet**:
      `python -m robin brain --fake-time 03:00 --window-min 2 --check-every 10 --cooldown-min 10 --answer-timeout 20`
      (the demo clock starts when you press Enter, so start it at minute 5:30, not earlier)
- [ ] Robin plugged in, face 😊. MQTT Explorer open. ntfy app open on the phone, sound ON.
- [ ] A paper cup that covers the PIR + LDR ("Robin goes to bed"), and your phone torch.
- [ ] Open on screen: architecture diagram (02), `reports/hourly_profile.png`, the comparison table from `metrics.json`, DB Browser with `data/robin.db`.
- [ ] Backup: the recorded video on the laptop desktop.

## The script (≈ 9.5 minutes)
| Time | Show | Say (in your own words) | Requirement |
|---|---|---|---|
| 0:00 | Robin + architecture diagram | "Robin is Tessa with senses and a memory: presence-aware reminders, and it learns the daily routine to notice unusual situations." | – |
| 0:45 | MQTT Explorer: `robin/robin-01/telemetry` every 2 s. Wave → `edges`/`high_ms` rise. Cover the LDR → `light` drops. | "PIR + LDR sampled at 10 Hz on the Arduino, summarised and sent every 2 s over MQTT, QoS 0." | **1, 2** |
| 2:00 | Press green → `event` message + ✓ on the face. Terminal: `python -m robin latency --count 20`. | "Events use QoS 1, so they're never lost. The face reacts locally, before any network. Round-trip median is … ms." | **2** |
| 3:00 | **Put the cup over Robin** ("bedtime"). `python -m robin report --hours 1`, then `mosquitto_pub -t robin/robin-01/telemetry -m garbage`, then report again: `rejected_messages` +1. DB Browser: tables. | "Ingestion validates, de-duplicates, and also pulls the weather API. Everything goes into SQLite. Bad data is quarantined, not fatal." | **3, 4** |
| 4:30 | `hourly_profile.png`, comparison table, `metrics.json` (`device: robin-01`, dates, `synthetic: false`). | "Trained on N days of MY Robin at home. Cleaned, 10-min windows, features… IsolationForest + a learned inactivity limit; compared with LOF and a z-score baseline." | **5, 6** |
| 5:30 | Start terminal 3 (the brain). Within ~20 s: `check 03:00 score +0.1…` lines, face 😴. | "The brain now thinks it's 03:00. That's a demo clock, so you don't have to wait for the night. Dark and quiet at 03:00 is normal, so the score is positive." | **6** |
| 6:15 | Remove the cup, torch on the LDR, walk in front. Log: score < 0 → Robin **asks** "Is everything alright?" → press **red** → "I'll let your family know" → **phone buzzes** with the explanation. | "Grandma gets up at night and switches on the light. Robin asks first, then escalates, and the alert says *why*." | **7** |
| 8:00 | DB Browser, SQL below: a reminder from your home week that was *due* at 08:30 but *asked* at 08:47, when you walked in. | "Unlike Tessa, it only speaks when someone is there. Here's the evidence from my own home." | **7** |
| 9:00 | Pull the USB plug of Robin. | "The Last Will says 'offline'; after 5 minutes the family gets an alert. It fails loudly, not silently." | 2, 7 |

SQL for minute 8 (DB Browser → *Execute SQL*):
```sql
SELECT datetime(ts, 'unixepoch', 'localtime') AS time, kind, detail
FROM actions WHERE kind IN ('reminder_due', 'asked', 'conversation')
ORDER BY ts DESC LIMIT 20;
```

## If something goes wrong
| Problem | Plan B |
|---|---|
| ✗ eyes (no WiFi/MQTT) | check hotspot + IP; restart Mosquitto; reset Robin (30 s) |
| No check-in happens | torch closer, move more, wait 20 s (the window needs data); worst case `python -m robin cmd "ask 8"` to show the action path, and say so honestly |
| No sound | `python -m robin cmd "vol 25"` |
| Laptop crash | play the proof video, then answer questions from the docs |

## Proof package for Gradework
- 3–5 photos: overview, wiring close-up, inside the box, the face, the phone notification.
- The video (≤ 5 min) of this script, uploaded as a file.
- Screenshots: `report` output over 24 h, `latency` output, the training table.
