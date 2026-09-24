# Test plan: Robin (components 1–4)

**Duo:** [names] · **Test team:** [names] · **Version tested:** firmware 1.0.0 / backend commit [hash] · **Date:** [ ]

## How to connect (for the test team)
- Hotspot SSID / password: *(give on the day)*
- Broker: laptop IP `[ ]`, port 1883, no password
- Watch messages: `mosquitto_sub -h [ip] -t "robin/#" -v` or MQTT Explorer
- Backend commands: run in `backend/` with the venv active (see docs/05)

## Test objectives
> One line each: *capability → why it matters for the user → measurable target.*
1.
2.
3.
4.

## Test cases
| ID | Component | Objective (risk) | What is tested | How (method, tools, duration, repetitions) | Expected result (measurable) | Actual result & notes (test team) | Pass/Fail |
|---|---|---|---|---|---|---|---|
| TC-01 | 1 sensor | | | | | | |
| TC-02 | 1 sensor | | | | | | |
| TC-03 | 2 protocol | | | | | | |
| TC-04 | 2 protocol | | | | | | |
| TC-05 | 3 ingestion | | | | | | |
| TC-06 | 3 ingestion | | | | | | |
| TC-07 | 4 storage | | | | | | |
| TC-08 | edge case | | | | | | |

## Results summary and improvements (after you receive the results)
| Finding | Root cause | Impact on the user | Improvement | Re-test result |
|---|---|---|---|---|
| | | | | |
