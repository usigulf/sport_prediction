"""App Store Connect keywords must start with sports, not ports (P1-008)."""
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
KEYWORDS = REPO_ROOT / "mobile" / "app-store-metadata" / "keywords.txt"
METADATA_COPY = REPO_ROOT / "mobile" / "docs" / "APP_STORE_METADATA_COPY.md"
SUBMIT_CHECKLIST = REPO_ROOT / "mobile" / "docs" / "APP_STORE_SUBMIT_CHECKLIST.md"

import re

_FORBIDDEN_KEYWORD_RE = re.compile(r"(?:^|[\s`])ports,", re.MULTILINE)


def _read_keywords() -> str:
    return KEYWORDS.read_text(encoding="utf-8").strip()


def test_canonical_keywords_file_exists_and_starts_with_sports():
    assert KEYWORDS.is_file()
    kw = _read_keywords()
    assert kw.startswith("sports,"), f"keywords must start with sports,: {kw!r}"
    assert len(kw) <= 100, f"ASC keywords limit is 100 chars, got {len(kw)}"


def test_metadata_copy_includes_canonical_keywords():
    canonical = _read_keywords()
    assert canonical in METADATA_COPY.read_text(encoding="utf-8")


def test_asc_metadata_sources_forbid_ports_typo():
    kw = _read_keywords()
    assert not kw.startswith("ports,")
    for path in (METADATA_COPY, SUBMIT_CHECKLIST):
        text = path.read_text(encoding="utf-8")
        assert not _FORBIDDEN_KEYWORD_RE.search(text), (
            f"{path.name} contains forbidden ports, keyword typo"
        )


def test_print_asc_keywords_script_references_canonical_file():
    script = (REPO_ROOT / "scripts" / "print_asc_keywords.sh").read_text(encoding="utf-8")
    assert "app-store-metadata/keywords.txt" in script
    assert "ports," in script  # guard against shipping the typo
