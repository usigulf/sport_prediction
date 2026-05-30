"""WebSocket JWT extraction (_get_ws_token): prefer Authorization Bearer, legacy query."""

from starlette.datastructures import Headers

from app.main import _get_ws_token


def _fake_ws(header_map: dict, query: bytes = b""):
    """Build a minimal object with `.headers` and `.scope` like a Starlette WebSocket."""
    w = object.__new__(type("W", (), {}))
    w.headers = Headers(header_map)  # type: ignore[attr-defined]
    w.scope = {"query_string": query}  # type: ignore[attr-defined]
    return w


def test_get_ws_token_prefers_authorization_bearer_header():
    tok = _get_ws_token(
        _fake_ws(
            {"authorization": "Bearer aaa.bbb.ccc"},
            b"token=from-query-ignored",
        )
    )
    assert tok == "aaa.bbb.ccc"


def test_get_ws_token_fallback_to_query_token():
    assert _get_ws_token(_fake_ws({}, b"token=qval&x=1")) == "qval"


def test_get_ws_token_access_token_query_alias():
    assert _get_ws_token(_fake_ws({}, b"access_token=legacy")) == "legacy"


def test_get_ws_token_returns_none_when_missing():
    assert _get_ws_token(_fake_ws({}, b"")) is None
