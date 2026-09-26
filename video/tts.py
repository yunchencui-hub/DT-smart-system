"""Batch text-to-speech for the video narration (Piper, one model load for all sentences).

Usage: python tts.py <model.onnx> <jobs.json> [length_scale]
jobs.json = [{"text": "...", "out": "build/tts/abc.wav"}, ...]; existing files are skipped.
"""
import json
import sys
import wave
from pathlib import Path

from piper import PiperVoice, SynthesisConfig


def main() -> None:
    model, jobs_file = sys.argv[1], sys.argv[2]
    length_scale = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
    jobs = [j for j in json.loads(Path(jobs_file).read_text()) if not Path(j["out"]).exists()]
    if not jobs:
        return
    voice = PiperVoice.load(model)
    cfg = SynthesisConfig(length_scale=length_scale)
    for i, job in enumerate(jobs, 1):
        out = Path(job["out"])
        out.parent.mkdir(parents=True, exist_ok=True)
        tmp = out.with_suffix(".tmp.wav")
        with wave.open(str(tmp), "wb") as wf:
            voice.synthesize_wav(job["text"], wf, syn_config=cfg)
        tmp.rename(out)
        print(f"[tts] {i}/{len(jobs)} {job['text'][:60]}", flush=True)


if __name__ == "__main__":
    main()
