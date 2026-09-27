"""Turn audio/tracks.yaml into voice files for the DFR0534 module, using Piper (offline neural TTS).

    pip install piper-tts pyyaml
    python audio/make_audio.py --lang en            # -> audio/en/01.mp3 ... + durations.json
    python audio/make_audio.py --lang nl --voice nl_NL-ronnie-medium

MP3 needs ffmpeg on your PATH; without it the script writes WAV files (the module plays both).
File names are just the track number (01.mp3) because the module uses old 8.3 DOS file names.
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import wave
from pathlib import Path

import yaml

HERE = Path(__file__).resolve().parent
DEFAULT_VOICES = {"en": "en_GB-cori-high", "nl": "nl_NL-ronnie-medium"}


def ensure_voice(voice: str, voices_dir: Path) -> Path:
    model = voices_dir / f"{voice}.onnx"
    if not model.exists():
        voices_dir.mkdir(parents=True, exist_ok=True)
        print(f"Downloading voice {voice} ...")
        subprocess.run(
            [sys.executable, "-m", "piper.download_voices", voice, "--download-dir", str(voices_dir)],
            check=True,
        )
    return model


def synthesize(text: str, model: Path, wav_path: Path, speed: float) -> int:
    """Writes a WAV file and returns its duration in milliseconds."""
    from piper import PiperVoice, SynthesisConfig

    voice = PiperVoice.load(str(model))
    config = SynthesisConfig(length_scale=speed)  # >1.0 = slower, easier to follow for older people
    with wave.open(str(wav_path), "wb") as wav:
        voice.synthesize_wav(text, wav, syn_config=config)
    with wave.open(str(wav_path), "rb") as wav:
        return round(wav.getnframes() / wav.getframerate() * 1000)


def to_mp3(wav_path: Path, mp3_path: Path) -> None:
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav_path),
         "-ac", "1", "-ar", "22050", "-b:a", "64k", str(mp3_path)],
        check=True,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--lang", default="en", choices=["en", "nl"])
    parser.add_argument("--voice", help="Piper voice name, e.g. en_GB-cori-high")
    parser.add_argument("--speed", type=float, default=1.1, help="length scale; 1.0 = normal speed")
    parser.add_argument("--format", default="mp3", choices=["mp3", "wav"])
    args = parser.parse_args()

    tracks = yaml.safe_load((HERE / "tracks.yaml").read_text(encoding="utf-8"))["tracks"]
    model = ensure_voice(args.voice or DEFAULT_VOICES[args.lang], HERE / "voices")
    out_dir = HERE / args.lang
    out_dir.mkdir(exist_ok=True)

    use_mp3 = args.format == "mp3" and shutil.which("ffmpeg") is not None
    if args.format == "mp3" and not use_mp3:
        print("ffmpeg not found: writing WAV files instead.")

    durations = {}
    for number, track in sorted(tracks.items()):
        wav_path = out_dir / f"{number:02d}.wav"
        durations[str(number)] = synthesize(track[args.lang], model, wav_path, args.speed)
        if use_mp3:
            to_mp3(wav_path, out_dir / f"{number:02d}.mp3")
            wav_path.unlink()
        print(f"  {number:02d}  {durations[str(number)]:5d} ms  {track['name']}")

    (out_dir / "durations.json").write_text(json.dumps(durations, indent=2) + "\n", encoding="utf-8")
    print(f"Done: {len(durations)} files in {out_dir}")


if __name__ == "__main__":
    main()
