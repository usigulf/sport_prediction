# App Store screenshots (iPhone 6.5" Display)

Apple requires **up to 10 screenshots** at **1284 × 2778 px** (portrait) for the **iPhone 6.5" Display** slot. The first **3** appear on the App Store install sheet.

This folder holds exported PNGs ready to drag into **App Store Connect → App → Previews and Screenshots → iPhone 6.5" Display**.

## Recommended 10 shots

| # | File | Screen | Why |
|---|------|--------|-----|
| 1 | `01-landing-hero.png` | Landing | Value prop + hero |
| 2 | `02-model-accuracy.png` | Model accuracy | Trust / transparency |
| 3 | `03-home-top-picks.png` | Home | Daily picks carousel |
| 4 | `04-games-model-picks.png` | Games → Model Picks | Core product |
| 5 | `05-trending-picks.png` | Trending | Discovery |
| 6 | `06-game-detail-prediction.png` | Game detail + prediction | Depth |
| 7 | `07-subscription-paywall.png` | Paywall | Monetization |
| 8 | `08-favorites.png` | Favorites | Personalization |
| 9 | `09-profile.png` | Profile | Account |
| 10 | `10-leaderboards.png` | Leaderboard | Pro / gamification |

Use **soccer games with real predictions** for shot 6 (Premier League / UCL). Avoid NFL/NBA if they show “No prediction” in your environment.

## One-time setup

1. **Dev build** on simulator (not Expo Go):
   ```bash
   cd mobile
   npx expo run:ios -d "iPhone 17"
   ```

2. **Metro with clean UI** (hides yellow dev warning banner):
   ```bash
   cd mobile
   EXPO_PUBLIC_HIDE_DEV_UI=true npx expo start --dev-client
   ```
   Screenshot deep links (`capture/home`, etc.) work automatically in **dev** after you reload the app (`r` in Metro).

3. Make the script executable:
   ```bash
   chmod +x mobile/scripts/capture-app-store-screenshots.sh
   ```

## Capture

**Guest only** (Landing + Accuracy — no login):
```bash
cd mobile
./scripts/capture-app-store-screenshots.sh guest
```

**Full set** (01–02 automatic, 03–10 you navigate on the simulator):
```bash
./scripts/capture-app-store-screenshots.sh all
```

**Logged-in only (recommended)** — log in first, then run; the script tells you which screen to open before each capture:
```bash
./scripts/capture-app-store-screenshots.sh auth
```

You must see the **tab bar** (Home, Trending, Games, …). If you still see Landing, log in before pressing Enter.

**Step-by-step** (prompts before each logged-in shot):
```bash
./scripts/capture-app-store-screenshots.sh interactive
```

Output: `mobile/app-store-screenshots/6.5-inch/*.png`

## Upload in App Store Connect

1. Open your app → **Distribution** → **App Store** → **Previews and Screenshots**
2. Select **iPhone 6.5" Display**
3. Drag the 10 PNGs from `6.5-inch/` (order: 01 → 10)
4. Optional: add up to **3 app preview videos** (same resolution, 15–30s)

## Tips

- **Status bar** is set to **9:41** automatically (Apple marketing style).
- **Simulator device**: Use the same device you built with (`iPhone 17` by default). Output is scaled to **1284×2778** for App Store Connect. Override with `SIMULATOR_DEVICE="iPhone 17 Pro Max"` only if the app is installed on that simulator.
- For **production-looking data**, use production API (`EXPO_PUBLIC_API_URL=https://api.octobetiq.com/api/v1`) and a logged-in account with favorites.
- **Screenshot deep links** (require `EXPO_PUBLIC_APP_STORE_CAPTURE=true`): `com.sportsprediction.app://capture/home`, `capture/games`, `capture/game/{id}`, etc. The capture script uses these so each shot navigates to the correct screen.
- **iPad / Apple Watch**: not required unless you ship those targets; add later in Media Manager if needed.

## App previews (optional)

Record screen video on the simulator (**File → Record Screen**), trim to 15–30s, export at 886×1920 or use Apple’s [Preview specifications](https://developer.apple.com/help/app-store-connect/reference/app-preview-specifications).
