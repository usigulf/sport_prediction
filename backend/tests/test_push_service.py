"""Expo push helper — category mapping for iOS notification channels."""
from app.services.push_service import (
    PUSH_CATEGORY_BY_TYPE,
    category_id_for_push_data,
    send_expo_push,
)


def test_category_id_for_push_data():
    assert category_id_for_push_data({"type": "game_reminder", "game_id": "1"}) == "kickoff"
    assert category_id_for_push_data({"type": "high_confidence", "game_id": "1"}) == "upset_picks"
    assert category_id_for_push_data({"type": "post_game_result", "game_id": "1"}) == "results"
    assert category_id_for_push_data({"type": "trial_ending"}) == "account"
    assert category_id_for_push_data({"type": "unknown"}) is None
    assert category_id_for_push_data(None) is None


def test_push_category_registry_covers_trigger_types():
    assert set(PUSH_CATEGORY_BY_TYPE) >= {
        "game_reminder",
        "high_confidence",
        "post_game_result",
        "trial_ending",
    }


def test_send_expo_push_includes_category_id(monkeypatch):
    captured: list[dict] = []

    class FakeResponse:
        status = 200

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

    def fake_urlopen(req, timeout=10):
        import json

        captured.extend(json.loads(req.data.decode("utf-8")))
        return FakeResponse()

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)

    send_expo_push(
        ["ExponentPushToken[test]"],
        "Title",
        "Body",
        data={"type": "game_reminder", "game_id": "abc"},
    )

    assert len(captured) == 1
    assert captured[0]["categoryId"] == "kickoff"
    assert captured[0]["data"]["type"] == "game_reminder"
