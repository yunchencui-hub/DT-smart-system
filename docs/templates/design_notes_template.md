# Prototype Design Notes: [your name], Robin

> **Individual deliverable, max 5 pages, may be hand-written.** Write it in *your own words* about *your own* contribution. This template only gives prompts; delete them as you go. The examiners use your notes to prepare questions, so everything you write, you must be able to explain for 3 minutes.
>
> Page budget (suggestion): 1. overview ¾ · 2. components 1¼ · 3. data flow and algorithms 1½ · 4. reflection 1 · references/appendix ½.

## 1. System overview
- In 3–4 sentences: what problem does Robin solve, for whom, and what makes it *smart* compared with Tessa?
- **Your own architecture sketch** (hand-drawn is fine and even encouraged): sensors → protocol → ingestion → storage → processing → model → action. Mark which parts *you* built.

## 2. Component choices (pick the ones you're proud of; show trade-offs)
For each chosen component, answer:
- What alternatives did you consider? (≥ 1)
- Which trade-off decided it (cost / accuracy / latency / privacy / effort)?
- **What did you measure or try yourself?** (a number, a plot, a failed attempt)

Prompts: PIR vs radar vs camera · reading the PIR on an analog pin · MQTT QoS per topic · local broker vs cloud · SQLite vs InfluxDB · the voice module without an SD card.

## 3. Data flow, processing and algorithms
- Follow one button press, and one sensor sample, through the whole system. Where can it get lost, delayed or duplicated, and what did you do about it?
- Real-time: your *measured* latency and loss (from your `latency`/`report` runs), and what dominates them.
- Processing: which cleaning steps, why these features, why this window length?
- Algorithm: why unsupervised; what your evaluation table says; your false-alarm rate per day and whether that is acceptable for the user; one thing you tuned and its effect.

## 4. Reflection on key challenges
- The 2–3 hardest problems: symptom → cause → how you found it → fix → what you learned.
  (e.g. something from the logic-level issue, a connection problem, the IsolationForest context bug, a surprise from the other duo's tests)
- What would break first when scaling to 100 homes? What would you change?
- Your learning style this semester (from your learning journal) and your "technical USP".

## References (few are needed)
- Only what you actually used (datasheets, docs, papers).
