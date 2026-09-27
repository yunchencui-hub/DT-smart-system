"""Command line entry point:  python -m robin <command> [options]

    ingest     MQTT + weather -> database (keep running while collecting data)
    brain      decisions + actions (reminders, check-ins, alerts)
    run        ingest + brain together (normal use and demo)
    train      train + evaluate the anomaly model on your recorded data
    simulate   virtual robot (testing without hardware)
    latency    measure MQTT round-trip time to the robot
    report     data-quality numbers for your test plan
    cmd        send one command to the robot, e.g.  python -m robin cmd "say 3"
"""
from __future__ import annotations

import argparse
import logging
import threading
import time
from datetime import datetime, timedelta

from .config import load_config


def _demo_offset(fake_time: str | None) -> float:
    """--fake-time 03:00 -> seconds to add to the real clock so the brain believes it is 03:00."""
    if not fake_time:
        return 0.0
    hours, minutes = (int(x) for x in fake_time.split(":"))
    now = datetime.now()
    target = now.replace(hour=hours, minute=minutes, second=now.second, microsecond=now.microsecond)
    if target < now - timedelta(hours=12):
        target += timedelta(days=1)
    return (target - now).total_seconds()


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m robin", description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--config", default="config.yaml")
    parser.add_argument("--device", help="override device_id from the config (e.g. sim-01)")
    parser.add_argument("-v", "--verbose", action="store_true")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("ingest")
    for name in ("brain", "run"):
        p = sub.add_parser(name)
        p.add_argument("--fake-time", help="DEMO: pretend the local time is HH:MM (time-of-day features, schedule)")
        p.add_argument("--window-min", type=float, help="DEMO: shorter scoring window, e.g. 2")
        p.add_argument("--check-every", type=float, help="DEMO: seconds between anomaly checks, e.g. 15")
        p.add_argument("--cooldown-min", type=float, help="DEMO: minutes between check-ins, e.g. 1")
        p.add_argument("--answer-timeout", type=float, help="DEMO: seconds to wait for a button, e.g. 20")

    p = sub.add_parser("train")
    p.add_argument("--window-min", type=float)
    p.add_argument("--algorithm", default="iforest", choices=["iforest", "lof"])
    p.add_argument("--contamination", type=float, default=0.02)
    p.add_argument("--test-days", type=int, default=1)
    p.add_argument("--allow-synthetic", action="store_true", help="dry run on simulator data only")

    p = sub.add_parser("simulate")
    p.add_argument("--backfill-days", type=float, default=0, help="write N days of history, then exit")
    p.add_argument("--auto-answer", choices=["yes", "no"], help="press this button after every question")

    p = sub.add_parser("latency")
    p.add_argument("--count", type=int, default=50)
    p.add_argument("--interval", type=float, default=0.5)

    p = sub.add_parser("report")
    p.add_argument("--hours", type=float, default=24)

    p = sub.add_parser("cmd")
    p.add_argument("text")

    args = parser.parse_args()
    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO,
                        format="%(asctime)s %(levelname)-7s %(name)s: %(message)s", datefmt="%H:%M:%S")
    logging.getLogger("matplotlib").setLevel(logging.WARNING)
    cfg = load_config(args.config)
    if args.device:
        cfg["device_id"] = args.device

    if args.command in ("brain", "run"):
        a = cfg["anomaly"]
        if args.window_min:
            a["window_min"] = args.window_min
        if args.check_every:
            a["check_every_s"] = args.check_every
        if args.cooldown_min is not None:
            a["cooldown_min"] = args.cooldown_min
        if args.answer_timeout:
            cfg["answers"]["timeout_s"] = args.answer_timeout

    stop = threading.Event()
    try:
        if args.command == "ingest":
            from . import ingest
            ingest.run(cfg, stop)
        elif args.command == "brain":
            from . import brain
            brain.run(cfg, _demo_offset(args.fake_time), stop)
        elif args.command == "run":
            from . import brain, ingest
            threading.Thread(target=ingest.run, args=(cfg, stop), name="ingest", daemon=True).start()
            time.sleep(1)
            brain.run(cfg, _demo_offset(args.fake_time), stop)
        elif args.command == "train":
            from . import train
            train.run(cfg, args.window_min, args.algorithm, args.contamination, args.test_days, args.allow_synthetic)
        elif args.command == "simulate":
            from . import simulate
            device = simulate.sim_name(args.device or "sim-01")
            if args.backfill_days:
                simulate.backfill(cfg, device, args.backfill_days)
            else:
                simulate.run(cfg, device, args.auto_answer, stop)
        elif args.command == "latency":
            from . import tools
            tools.latency(cfg, args.count, args.interval)
        elif args.command == "report":
            from . import tools
            tools.report(cfg, args.hours)
        elif args.command == "cmd":
            from . import tools
            tools.send_command(cfg, args.text)
    except KeyboardInterrupt:
        stop.set()
        print("\nstopped")


if __name__ == "__main__":
    main()
