"""App Store Review demo account rotation."""
import importlib.util
from pathlib import Path


_REPO_ROOT = Path(__file__).resolve().parents[2]
_SCRIPT = _REPO_ROOT / "scripts" / "rotate_app_review_demo_account.py"
_spec = importlib.util.spec_from_file_location("rotate_app_review_demo_account", _SCRIPT)
_mod = importlib.util.module_from_spec(_spec)
assert _spec.loader is not None
_spec.loader.exec_module(_mod)

rotate_demo_account = _mod.rotate_demo_account
_generate_password = _mod._generate_password

from app.models.user import User  # noqa: E402


def test_generate_password_meets_policy():
    pwd = _generate_password()
    assert len(pwd) >= 20
    assert any(c.islower() for c in pwd)
    assert any(c.isupper() for c in pwd)
    assert any(c.isdigit() for c in pwd)


def test_rotate_creates_premium_user(db):
    email = "appstore-review@octobetiq.com"
    action = rotate_demo_account(
        email=email,
        password="NewReviewPass2026!X",
        subscription_tier="premium",
        db=db,
    )
    assert action == "created"
    user = db.query(User).filter(User.email == email).first()
    assert user is not None
    assert user.subscription_tier == "premium"


def test_rotate_updates_existing_password(db, test_user):
    new_password = "RotatedReviewPass2026!Z"
    action = rotate_demo_account(
        email=test_user.email,
        password=new_password,
        subscription_tier="premium_plus",
        db=db,
    )
    assert action == "updated"
    db.refresh(test_user)
    assert test_user.subscription_tier == "premium_plus"
    from app.core.security import verify_password

    assert verify_password(new_password, test_user.password_hash)
