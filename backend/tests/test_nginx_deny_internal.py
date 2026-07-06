"""Deploy/nginx snippets must block public /internal access."""
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DENY_SNIPPET = REPO_ROOT / "deploy" / "nginx-deny-internal-snippet.conf"
API_EXAMPLE = REPO_ROOT / "deploy" / "nginx-octobetiq-api.conf.example"


def test_deny_internal_snippet_exists_and_returns_403():
    text = DENY_SNIPPET.read_text(encoding="utf-8")
    assert "location ^~ /internal/" in text
    assert "return 403" in text


def test_api_site_example_includes_deny_snippet_before_catch_all():
    text = API_EXAMPLE.read_text(encoding="utf-8")
    deny_pos = text.find("octobetiq-deny-internal.conf")
    catch_all_pos = text.find("location / {")
    assert deny_pos != -1
    assert catch_all_pos != -1
    assert deny_pos < catch_all_pos
