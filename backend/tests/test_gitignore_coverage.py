"""coverage.xml is a generated pytest artifact and must stay untracked (P1-009)."""
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_gitignore_ignores_coverage_xml():
    text = (REPO_ROOT / ".gitignore").read_text(encoding="utf-8")
    lines = {ln.strip() for ln in text.splitlines() if ln.strip() and not ln.strip().startswith("#")}
    assert "coverage.xml" in lines


def test_coverage_xml_not_tracked_in_git():
    tracked = {
        Path(p).as_posix()
        for p in __import__("subprocess")
        .run(
            ["git", "ls-files", "coverage.xml", "backend/coverage.xml"],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        .stdout.splitlines()
        if p.strip()
    }
    assert tracked == set(), f"coverage.xml should be untracked, still tracked: {tracked}"
