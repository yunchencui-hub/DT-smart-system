"""Where models and reports go: the robot and the simulator must never share or overwrite each other's files."""
import pytest

from robin.config import load_config, model_file, report_dir
from robin.model import AnomalyModel
from robin.train import ensure_own_model_file
from test_model import normal_days


def test_simulator_reports_go_to_their_own_folder(cfg, tmp_path):
    assert report_dir(cfg) == tmp_path / "reports"               # the robot: reports/ (the docs' evidence folder)
    cfg["device_id"] = "sim-01"
    assert report_dir(cfg) == tmp_path / "reports" / "sim-01"


def test_device_id_is_made_safe_for_file_names(cfg):
    cfg["device_id"] = "robin:01*"                                # ':' and '*' are not allowed in Windows file names
    assert model_file(cfg).name == "anomaly-robin_01_.joblib"


def test_numeric_device_id_becomes_text(tmp_path):
    path = tmp_path / "config.yaml"
    path.write_text("device_id: 42\n", encoding="utf-8")
    cfg = load_config(path)
    assert cfg["device_id"] == "42"
    assert model_file(cfg).name == "anomaly-42.joblib"


def test_training_never_overwrites_another_devices_model(tmp_path):
    shared = tmp_path / "anomaly.joblib"                           # an old config: one model_path for every device
    AnomalyModel().fit(normal_days(days=2), device="robin-01").save(shared)
    with pytest.raises(SystemExit, match="robin-01"):
        ensure_own_model_file(shared, "sim-01")
    ensure_own_model_file(shared, "robin-01")                      # retraining the same device is fine
    ensure_own_model_file(tmp_path / "missing.joblib", "sim-01")   # so is a first training
    (tmp_path / "broken.joblib").write_bytes(b"not a model")
    ensure_own_model_file(tmp_path / "broken.joblib", "sim-01")    # an unreadable file holds nothing to protect
