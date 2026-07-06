"""
Rotate the App Store Review demo account password in the production database.

Never commit the password. Store it only in App Store Connect and a local
gitignored file (secrets/app_review_demo.env).

Usage (on API host with DATABASE_URL):
  APP_REVIEW_DEMO_PASSWORD='new-strong-password' python scripts/rotate_app_review_demo_account.py

  # Generate a random password and write secrets/app_review_demo.env (gitignored):
  python scripts/rotate_app_review_demo_account.py --generate --write-env-file

  docker compose exec api python /app/scripts/rotate_app_review_demo_account.py --generate --write-env-file
"""
from __future__ import annotations

import argparse
import os
import secrets
import string
import sys
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
_ROOT = _SCRIPT_DIR.parent
_BACKEND = _ROOT / "backend"
if (_BACKEND / "app").is_dir():
    sys.path.insert(0, str(_BACKEND))
elif (_ROOT / "app").is_dir():
    sys.path.insert(0, str(_ROOT))
else:
    sys.path.insert(0, str(_BACKEND))

from app.core.security import get_password_hash, verify_password
from app.database import SessionLocal
from app.models.user import User

DEFAULT_EMAIL = "appstore-review@octobetiq.com"
DEFAULT_TIER = "premium"
DEFAULT_ENV_FILE = _ROOT / "secrets" / "app_review_demo.env"


def _generate_password(length: int = 24) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%&*-_"
    while True:
        pwd = "".join(secrets.choice(alphabet) for _ in range(length))
        if (
            any(c.islower() for c in pwd)
            and any(c.isupper() for c in pwd)
            and any(c.isdigit() for c in pwd)
            and any(c in "!@#$%&*-_" for c in pwd)
        ):
            return pwd


def rotate_demo_account(
    *,
    email: str,
    password: str,
    subscription_tier: str = DEFAULT_TIER,
    db=None,
) -> str:
    """Create or update the review demo user. Returns action taken."""
    owns_session = db is None
    if owns_session:
        db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        password_hash = get_password_hash(password)
        if user is None:
            user = User(
                email=email,
                password_hash=password_hash,
                subscription_tier=subscription_tier,
            )
            db.add(user)
            db.commit()
            if owns_session:
                db.refresh(user)
            action = "created"
        else:
            user.password_hash = password_hash
            user.subscription_tier = subscription_tier
            db.commit()
            if owns_session:
                db.refresh(user)
            action = "updated"
        if not verify_password(password, user.password_hash):
            raise RuntimeError("Password hash verification failed after rotate")
        return action
    finally:
        if owns_session:
            db.close()


def _shell_quote(value: str) -> str:
    return "'" + value.replace("'", "'\"'\"'") + "'"


def write_env_file(path: Path, email: str, password: str) -> Path:
    content = "\n".join(
        [
            "# App Store Review demo credentials — gitignored; never commit.",
            f"VERIFY_DEMO_EMAIL={_shell_quote(email)}",
            f"VERIFY_DEMO_PASSWORD={_shell_quote(password)}",
            f"APP_REVIEW_DEMO_EMAIL={_shell_quote(email)}",
            f"APP_REVIEW_DEMO_PASSWORD={_shell_quote(password)}",
            "",
        ]
    )
    candidates = [path, Path("/tmp/app_review_demo.env")]
    last_error: Exception | None = None
    for target in candidates:
        try:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content, encoding="utf-8")
            target.chmod(0o600)
            return target
        except OSError as exc:
            last_error = exc
            continue
    raise RuntimeError(f"Could not write demo env file: {last_error}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Rotate App Store Review demo account password.")
    parser.add_argument(
        "--email",
        default=os.environ.get("APP_REVIEW_DEMO_EMAIL", DEFAULT_EMAIL),
        help="Demo account email (default: appstore-review@octobetiq.com)",
    )
    parser.add_argument(
        "--tier",
        default=os.environ.get("APP_REVIEW_DEMO_TIER", DEFAULT_TIER),
        help="subscription_tier to enforce (default: premium)",
    )
    parser.add_argument(
        "--generate",
        action="store_true",
        help="Generate a random password when APP_REVIEW_DEMO_PASSWORD is unset",
    )
    parser.add_argument(
        "--write-env-file",
        action="store_true",
        help=f"Write VERIFY_DEMO_* vars to {DEFAULT_ENV_FILE.relative_to(_ROOT)}",
    )
    parser.add_argument(
        "--env-file",
        type=Path,
        default=DEFAULT_ENV_FILE,
        help="Path for --write-env-file output",
    )
    args = parser.parse_args()

    password = os.environ.get("APP_REVIEW_DEMO_PASSWORD", "").strip()
    if not password:
        if args.generate:
            password = _generate_password()
        else:
            print(
                "Set APP_REVIEW_DEMO_PASSWORD or pass --generate.",
                file=sys.stderr,
            )
            return 1

    action = rotate_demo_account(
        email=args.email.strip().lower(),
        password=password,
        subscription_tier=args.tier.strip(),
    )
    print(f"OK demo account {action}: {args.email} (tier={args.tier})")

    if args.write_env_file:
        written = write_env_file(args.env_file, args.email, password)
        print(f"OK wrote {written} (mode 600) — update App Store Connect App Review Information")
        if str(written).startswith("/tmp/"):
            print("Tip: copy to host secrets/ e.g. scp root@host:/tmp/app_review_demo.env secrets/")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
