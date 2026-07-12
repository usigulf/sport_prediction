"""Public web/mobile copy must not claim unsourced win-rate superiority (P1-007 / audit #4)."""
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
WEB_DIR = REPO_ROOT / "web"
MOBILE_SRC = REPO_ROOT / "mobile" / "src"

# Marketing accuracy claims like "62%+ accuracy" — not single-pick demo lines ("Team @ 62%").
_FORBIDDEN_PCT = re.compile(r"62%\s*\+", re.IGNORECASE)
_FORBIDDEN_WIN_MORE = re.compile(r"AI\s+Picks\s+That\s+Win\s+More", re.IGNORECASE)
_FORBIDDEN_BEATS_CL = re.compile(r"beats the closing line", re.IGNORECASE)


def test_web_html_has_no_unsourced_62_plus_claims():
    html_files = list(WEB_DIR.glob("*.html")) + list((WEB_DIR / "payment").glob("*.html"))
    assert html_files, "expected web HTML files"
    for path in html_files:
        text = path.read_text(encoding="utf-8")
        match = _FORBIDDEN_PCT.search(text)
        assert match is None, f"{path.relative_to(REPO_ROOT)} contains forbidden 62%+ claim: {match.group(0)!r}"


def test_web_and_mobile_have_no_win_more_slogan():
    web_files = list(WEB_DIR.glob("*.html"))
    mobile_files = list(MOBILE_SRC.rglob("*.tsx")) + list(MOBILE_SRC.rglob("*.ts"))
    for path in web_files + mobile_files:
        text = path.read_text(encoding="utf-8")
        for pattern in (_FORBIDDEN_WIN_MORE, _FORBIDDEN_BEATS_CL):
            match = pattern.search(text)
            assert match is None, (
                f"{path.relative_to(REPO_ROOT)} contains forbidden claim: {match.group(0)!r}"
            )
