# App Store app preview video

Optional **15–30 second** preview for the **iPhone 6.5" Display** slot. Up to **3** previews per locale.

## Automated recording (recommended)

### 1. Start Metro (terminal 1)

```bash
cd mobile
EXPO_PUBLIC_HIDE_DEV_UI=true EXPO_PUBLIC_APP_STORE_CAPTURE=true \
set -a && source secrets/app_review_demo.env && set +a
EXPO_PUBLIC_CAPTURE_LOGIN_EMAIL="$VERIFY_DEMO_EMAIL" \
EXPO_PUBLIC_CAPTURE_LOGIN_PASSWORD="$VERIFY_DEMO_PASSWORD" \
npx expo start --dev-client
```

### 2. Record (terminal 2)

```bash
cd mobile
chmod +x scripts/record-app-store-preview.sh
./scripts/record-app-store-preview.sh
```

**Output:** `app-store-screenshots/6.5-inch/previews/01-app-preview.mp4` (886×1920, H.264, no audio)

### What the script shows (~28s)

1. Auto-login (review account)
2. **Home** — Best Picks carousel
3. **Game detail** — win probability (soccer game from API when available)
4. **Model accuracy** — methodology + tracked stats

## Manual recording (Simulator)

1. Boot **iPhone 17** simulator with dev build installed
2. Set status bar: run `./scripts/capture-app-store-screenshots.sh landing` once (sets 9:41), or use the preview script’s status bar step
3. **File → Record Screen** in Simulator (or `xcrun simctl io booted recordVideo out.mov`)
4. Walk through: Home → game → Accuracy
5. Stop at **15–30 seconds**
6. Trim in QuickTime → **Export** → 1080p, H.264

## Upload

1. [App Store Connect](https://appstoreconnect.apple.com/apps/6762173223/distribution/ios/version/inflight) → **Previews and Screenshots**
2. **iPhone 6.5" Display** → **App Preview** → **+**
3. Upload `01-app-preview.mp4`
4. Add optional poster frame (first frame is used if you skip)

## Apple requirements

| Rule | Notes |
|------|--------|
| Length | 15–30 seconds |
| Size | 886 × 1920 px (portrait, 6.5" slot) |
| Codec | H.264 or HEVC |
| Audio | Optional; our export is silent |
| Content | Only in-app footage — no pricing claims you can’t substantiate |
| Overlays | Avoid “#1” or fake accuracy %; use in-app numbers |

## Tips

- Hide dev UI: `EXPO_PUBLIC_HIDE_DEV_UI=true` (required)
- Use **production API** for real picks on screen
- Re-record if login spinner or error banner appears
- Install **ffmpeg** for automatic encode: `brew install ffmpeg`

## npm shortcut

```bash
npm run app-store:preview
```
