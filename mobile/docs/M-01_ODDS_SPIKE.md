# M-01 · Odds API spike (display only)

## Scope

Show **consensus sportsbook lines** and a **model vs market** badge on Game Detail. Informational only — not betting advice or a sportsbook offer.

## Backend

- **Default provider:** ClearSports (`clearsports`) via `GET /api/v1/{league}/game-odds`
- **Optional override:** set `ODDS_API_KEY` to use [The Odds API](https://the-odds-api.com/) instead
- **Endpoint:** `GET /api/v1/games/{game_id}/market-odds`
- **Service:** `backend/app/services/odds_service.py`
- **Leagues:** nfl, nba, mls, premier_league, bundesliga, la_liga, serie_a, champions_league

### Env (API container)

| Variable | Required | Default |
|----------|----------|---------|
| `CLEARSPORTS_API_KEY` | Yes (unless `ODDS_API_KEY` set) | — |
| `ODDS_API_KEY` | No | — (The Odds API override) |
| `ODDS_API_BASE_URL` | No | `https://api.the-odds-api.com/v4` |
| `ODDS_API_REGIONS` | No | `us` |
| `ODDS_API_MARKETS` | No | `h2h,spreads,totals` |
| `ODDS_API_CACHE_TTL_SECONDS` | No | `300` |

No separate odds key is needed when `CLEARSPORTS_API_KEY` is already set for schedules. Without either key, the endpoint returns `{ "available": false, "reason": "not_configured" }`.

**Note:** ClearSports `game-odds` may return empty on free tiers until odds are enabled on your plan; the integration is wired and will surface lines when the feed has data.

## Mobile

- **Flag:** `EXPO_PUBLIC_ODDS_DISPLAY_ENABLED=true` → `ODDS_DISPLAY_ENABLED`
- **API:** `apiService.getMarketOdds(gameId)`
- **UI:** `MarketOddsCard` on `GameDetailScreen` (after prediction, when `available`)

## Rollout

1. Ensure `CLEARSPORTS_API_KEY` is in VPS `.env` (already used for schedules). Rebuild API — no `ODDS_API_KEY` required.
2. Enable mobile flag in EAS env for the build that should show odds (e.g. 1.0.1 build 31).
3. Monitor Odds API usage/credits in provider dashboard.

## Deferred

- CLV tracking, bet placement, player props lines, in-play odds refresh beyond cache TTL.
