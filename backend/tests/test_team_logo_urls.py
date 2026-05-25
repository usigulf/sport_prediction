"""Default team logo URL helpers."""
import uuid

from app.models.team import Team
from app.utils.team_logo_urls import default_team_logo_url, team_to_api_dict


def test_default_logo_nfl():
    url = default_team_logo_url("nfl", "KC")
    assert url == "https://a.espncdn.com/i/teamlogos/nfl/500/kc.png"


def test_default_logo_nba():
    url = default_team_logo_url("nba", "LAL")
    assert url == "https://a.espncdn.com/i/teamlogos/nba/500/lal.png"


def test_default_logo_soccer_mapped():
    url = default_team_logo_url("premier_league", "ARS")
    assert url == "https://a.espncdn.com/i/teamlogos/soccer/500/359.png"


def test_default_logo_unknown_soccer_abbr():
    assert default_team_logo_url("premier_league", "ZZZ") is None


def test_default_logo_pl_alias_mci():
    """Sportradar-style MCI maps to same crest as ESPN’s MNC."""
    assert default_team_logo_url("premier_league", "MCI") == (
        "https://a.espncdn.com/i/teamlogos/soccer/500/382.png"
    )


def test_default_logo_pl_full_table_team():
    assert default_team_logo_url("premier_league", "NEW") == (
        "https://a.espncdn.com/i/teamlogos/soccer/500/361.png"
    )


def test_default_logo_nfl_was_commanders():
    assert default_team_logo_url("nfl", "WAS") == (
        "https://a.espncdn.com/i/teamlogos/nfl/500/wsh.png"
    )


def test_team_to_api_dict_fills_missing_logo():
    t = Team(
        id=uuid.uuid4(),
        name="Kansas City Chiefs",
        league="nfl",
        abbreviation="KC",
        logo_url=None,
    )
    d = team_to_api_dict(t)
    assert d is not None
    assert d["logo_url"] == "https://a.espncdn.com/i/teamlogos/nfl/500/kc.png"


def test_team_to_api_dict_keeps_existing_logo():
    t = Team(
        id=uuid.uuid4(),
        name="X",
        league="nfl",
        abbreviation="KC",
        logo_url="https://cdn.example.com/custom.png",
    )
    d = team_to_api_dict(t)
    assert d["logo_url"] == "https://cdn.example.com/custom.png"
