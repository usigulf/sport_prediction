"""P3-006: React Query for upcoming games on Home and Games screens."""
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
MOBILE = REPO_ROOT / "mobile"


def test_react_query_dependency_present():
    pkg = (MOBILE / "package.json").read_text(encoding="utf-8")
    assert "@tanstack/react-query" in pkg


def test_query_client_provider_wired_in_app():
    app = (MOBILE / "App.tsx").read_text(encoding="utf-8")
    assert "QueryClientProvider" in app
    assert "queryClient" in app


def test_upcoming_games_hook_uses_react_query():
    hook = (MOBILE / "src/hooks/useUpcomingGamesQuery.ts").read_text(encoding="utf-8")
    assert "useQuery" in hook
    assert "upcomingGamesQueryKey" in hook
    assert "readGamesCache" in hook
    assert "useNetworkStatus" in hook


def test_home_and_games_use_upcoming_games_query():
    home = (MOBILE / "src/screens/HomeScreen.tsx").read_text(encoding="utf-8")
    games = (MOBILE / "src/screens/GamesScreen.tsx").read_text(encoding="utf-8")
    assert "useUpcomingGamesQuery" in home
    assert "fetchUpcomingGames" not in home
    assert "useUpcomingGamesQuery" in games
    assert "fetchUpcomingGames" not in games


def test_games_slice_no_longer_lists_upcoming_games():
    slice_src = (MOBILE / "src/store/slices/gamesSlice.ts").read_text(encoding="utf-8")
    assert "upcomingGames" not in slice_src
    assert "fetchUpcomingGames" not in slice_src
    assert "useUpcomingGamesQuery" in (MOBILE / "src/hooks/useUpcomingGamesQuery.ts").read_text(encoding="utf-8")
