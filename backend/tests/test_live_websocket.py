"""WebSocket JWT extraction (_get_ws_token): Bearer header or bearer.<jwt> subprotocol only."""

from typing import List, Optional

from starlette.datastructures import Headers

from app.main import _get_ws_token


def _fake_ws(header_map: dict, query: bytes = b"", subprotocols: Optional[List[str]] = None):
    """Build a minimal object with `.headers` and `.scope` like a Starlette WebSocket."""
    w = object.__new__(type("W", (), {}))
    w.headers = Headers(header_map)  # type: ignore[attr-defined]
    w.scope = {  # type: ignore[attr-defined]
        "query_string": query,
        "subprotocols": subprotocols or [],
    }
    return w


def test_get_ws_token_prefers_authorization_bearer_header():
    tok = _get_ws_token(
        _fake_ws(
            {"authorization": "Bearer aaa.bbb.ccc"},
            b"token=from-query-ignored",
            ["bearer.ignored-too"],
        )
    )
    assert tok == "aaa.bbb.ccc"


def test_get_ws_token_accepts_bearer_subprotocol():
    assert _get_ws_token(_fake_ws({}, b"token=ignored", ["bearer.qval"])) == "qval"


def test_get_ws_token_ignores_legacy_query_token():
    assert _get_ws_token(_fake_ws({}, b"token=qval&x=1")) is None


def test_get_ws_token_returns_none_when_missing():
    assert _get_ws_token(_fake_ws({}, b"")) is None
