# iOS home-screen widget (I70)

## Status

- **API:** `GET /api/v1/feed/widget/top-pick` — public JSON for WidgetKit timeline reloads.
- **Native:** Swift template at `mobile/ios/TopPickWidget/TopPickWidget.swift` (add Widget Extension target in Xcode).

## Widget payload

```json
{
  "pick": {
    "game_id": "...",
    "headline": "Chiefs favored",
    "matchup": "KC vs BUF",
    "confidence": "high",
    "scheduled_time_iso": "..."
  },
  "disclaimer": "Informational only — not betting advice."
}
```

## ASC notes

- Widget copy must match in-app gambling disclaimers.
- No odds or sportsbook CTAs in widget UI.
