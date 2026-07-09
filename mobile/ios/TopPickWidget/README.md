# iOS Widget — Today's Top Pick (I70)

Lightweight **WidgetKit** template for octobetiQ. The widget fetches public JSON from:

`GET https://api.octobetiq.com/api/v1/feed/widget/top-pick`

## Setup (Xcode)

1. Open `mobile/ios/octobetiQ.xcworkspace` in Xcode.
2. **File → New → Target → Widget Extension** named `TopPickWidget`.
3. Replace generated Swift with `TopPickWidget.swift` in this folder.
4. Add App Group `group.com.sportsprediction.app` to app + widget targets (optional cache).
5. Embed the widget extension in the octobetiQ app target.

## App Store

- Widget shows informational pick text only (not betting advice).
- Requires network for refresh; timeline reload every 30–60 minutes.

See also: `docs/IOS_WIDGET.md`.
