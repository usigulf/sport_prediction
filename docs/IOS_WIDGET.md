# iOS home-screen widget (I70)

## Status

| Piece | Location | Status |
|-------|----------|--------|
| Public API | `GET /api/v1/feed/widget/top-pick` | ✅ deployed |
| API verifier | `scripts/verify_widget_api.sh` | ✅ in repo |
| Swift template | `mobile/ios/TopPickWidget/TopPickWidget.swift` | ✅ in repo |
| Widget Extension target | Xcode project | ⚠️ manual — not embedded in `octobetiQ.xcodeproj` yet |

## Verify API (no Xcode required)

```bash
# Production
bash scripts/verify_widget_api.sh

# Local backend
BASE_URL=http://127.0.0.1:8000 bash scripts/verify_widget_api.sh
```

From `mobile/`:

```bash
npm run widget:verify
```

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

When no pick is available, `pick` is `null` and the widget should show the disclaimer only.

## Xcode embed checklist (one-time)

1. Open `mobile/ios/octobetiQ.xcworkspace` in Xcode.
2. **File → New → Target → Widget Extension**  
   - Product name: `TopPickWidget`  
   - Include Configuration App Intent: **No**  
   - Finish (activate scheme when prompted).
3. Replace the generated Swift file with `mobile/ios/TopPickWidget/TopPickWidget.swift` (or copy its `Provider` / `TopPickWidgetEntryView` into the target).
4. Set the widget extension **bundle identifier** to `com.octobetiQ.app.TopPickWidget` (match your app id + suffix).
5. **Signing:** same team as the main app; enable **App Groups** `group.com.sportsprediction.app` on **both** app and widget targets (optional timeline cache).
6. **Embed:** Main app target → **General → Frameworks, Libraries, and Embedded Content** — confirm `TopPickWidget.appex` is listed (Xcode usually adds this).
7. Build & run on device/simulator → long-press home screen → add **octobetiQ Top Pick** widget.
8. Confirm timeline reload hits `https://api.octobetiq.com/api/v1/feed/widget/top-pick` (see Xcode console / network).

## Deep link

Widget tap should open the app to game detail when `pick.game_id` is set. Wire `widgetURL` in Swift:

```swift
.widgetURL(URL(string: "octobetiq://game/\(entry.gameId)"))
```

Ensure `octobetiq://` is registered in the main app (`app.config.js` / `Info.plist`).

## ASC / compliance notes

- Widget copy must match in-app gambling disclaimers (`disclaimer` field from API).
- No odds lines, sportsbook CTAs, or “bet now” language in widget UI.
- Widget is informational only — same positioning as the main app.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Widget shows placeholder | Run `verify_widget_api.sh`; ensure prod has a scheduled pick today |
| Build error “No such module WidgetKit” | Widget target iOS deployment ≥ 14 |
| Widget never updates | WidgetKit schedules reloads; timeline policy in Swift template uses `.after(nextUpdate)` |

See also `mobile/ios/TopPickWidget/README.md`.
