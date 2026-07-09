# API v2 Planning (Imp #78)

## Goals

- Versioned surface at `/api/v2` without breaking v1 mobile/web clients
- OpenAPI-first schema with codegen for mobile (`openapi-typescript`)
- Consistent pagination, error envelope, and ETag caching

## Scope (phase 1)

| Area | v1 today | v2 change |
|------|----------|-----------|
| Games list | Mixed query params | Cursor pagination + `If-None-Match` |
| Predictions | Nested under game | Optional `/predictions/{id}` resource |
| Subscriptions | Stripe + RC webhooks | Unchanged paths; v2 adds `GET /me/subscription` |
| Stats | Multiple endpoints | `/stats/summary` aggregate |

## Non-goals (v2.0)

- GraphQL
- Breaking auth token format
- Removing v1 before 2027-01-01 sunset notice

## Rollout

1. Ship v2 routes behind `FEATURE_API_V2=true`
2. Generate mobile client from OpenAPI; migrate screen-by-screen
3. Deprecation headers on v1 after 90-day dual-run

## References

- `backend/app/api/v1/router.py`
- `docs/API_AND_DATABASE_REVIEW.md`
