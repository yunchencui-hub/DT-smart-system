import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from robin import db  # noqa: E402
from robin.config import load_config  # noqa: E402


@pytest.fixture
def cfg(tmp_path):
    config = load_config(None)
    config["_base_dir"] = str(tmp_path)
    config["database"] = str(tmp_path / "test.db")
    config["device_id"] = "robin-test"
    return config


@pytest.fixture
def conn(cfg):
    connection = db.connect(cfg["database"])
    yield connection
    connection.close()


def telemetry(seq, *, boot=1, ms=None, n=20, pir=0, edges=0, high_ms=0, light=500, rssi=-60):
    return {"boot": boot, "seq": seq, "ms": ms if ms is not None else 120000 + seq * 2000, "n": n,
            "pir": pir, "edges": edges, "high_ms": high_ms, "light": light, "rssi": rssi}
