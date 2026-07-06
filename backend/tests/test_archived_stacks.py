"""Legacy ml/ and Rust scaffolds are archived (P2-005)."""
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_stale_ml_scripts_archived():
    assert not (REPO_ROOT / "ml/training/train_simple_model.py").exists()
    assert not (REPO_ROOT / "ml/inference/simple_inference.py").exists()
    assert (REPO_ROOT / "archive/ml/training/train_simple_model.py").is_file()
    assert (REPO_ROOT / "archive/ml/inference/simple_inference.py").is_file()


def test_rust_predictions_service_archived():
    assert not (REPO_ROOT / "services/predictions/Cargo.toml").exists()
    assert (REPO_ROOT / "archive/services/predictions/Cargo.toml").is_file()


def test_ml_readme_points_to_backend_train():
    text = (REPO_ROOT / "ml/README.md").read_text(encoding="utf-8")
    assert "train_model.py" in text
    assert "archive/ml" in text


def test_architecture_documents_shipped_stack():
    text = (REPO_ROOT / "ARCHITECTURE.md").read_text(encoding="utf-8")
    assert "3.0 Shipped implementation" in text
    assert "archive/" in text
    assert "FastAPI" in text
