"""Public web copy must not claim unsourced 62%+ accuracy (P1-007)."""
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
WEB_DIR = REPO_ROOT / "web"

# Marketing accuracy claims like "62%+ accuracy" — not single-pick demo lines ("Team @ 62%").
_FORBIDDEN = re.compile(r"62%\s*\+", re.IGNORECASE)


def test_web_html_has_no_unsourced_62_plus_claims():
    html_files = list(WEB_DIR.glob("*.html")) + list((WEB_DIR / "payment").glob("*.html"))
    assert html_files, "expected web HTML files"
    for path in html_files:
        text = path.read_text(encoding="utf-8")
        match = _FORBIDDEN.search(text)
        assert match is None, f"{path.relative_to(REPO_ROOT)} contains forbidden 62%+ claim: {match.group(0)!r}"
