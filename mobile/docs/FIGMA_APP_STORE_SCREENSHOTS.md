# App Store screenshots via Figma template

Wrap your real app captures in the **[App Store Screenshot Design](https://www.figma.com/community/file/1649656460910339105)** kit (Az C'lio).

**Your file (Figma Make):**  
[App Store Screenshot Design (Community)](https://www.figma.com/make/3jFXJYNTqUKvvQPjOHxgLt/App-Store-Screenshot-Design--Community-?p=f&t=MOqyK6nnmksF5Dem-0)

Workflow options:

1. **External screenshots (recommended)** — finished PNGs in `~/Documents/app_screenshot` → import script → ASC upload
2. **Figma template** — capture in simulator → place PNGs in Figma → export → import script

---

## Quick path: external screenshots

If you already have finished marketing screenshots (e.g. from Figma export or Canva):

```bash
cd mobile
npm run screenshots:import
```

**Source folders (defaults):**

| Device | Folder | ASC size |
|--------|--------|----------|
| iPhone 6.5" | `/Users/Users/Documents/app_screenshot` | 1284×2778 |
| iPad 13" | `/Users/Users/Documents/app_ipad` | 2064×2752 |

Overrides:

```bash
APP_SCREENSHOT_SRC=/path/iphone npm run screenshots:import
APP_SCREENSHOT_IPAD_SRC=/path/ipad npm run screenshots:import
```

Drop **10 PNGs** per folder, in capture order (sorted alphabetically by filename). Expected mapping:

| # | ASC file | Screen |
|---|----------|--------|
| 01 | `01-home-top-picks.png` | Home — Best Picks |
| 02 | `02-game-detail-prediction.png` | Game detail |
| 03 | `03-model-accuracy.png` | Model accuracy |
| 04 | `04-trending-picks.png` | Trending |
| 05 | `05-subscription-paywall.png` | Paywall |
| 06 | `06-favorites.png` | Favorites |
| 07 | `07-games-model-picks.png` | Games |
| 08 | `08-leaderboards.png` | Leaderboards |
| 09 | `09-landing-hero.png` | Landing hero |
| 10 | `10-profile.png` | Profile |

Outputs:

- `app-store-screenshots/6.5-inch/asc-upload/` — iPhone **1284×2778**
- `app-store-screenshots/ipad-13-inch/asc-upload/` — iPad **2064×2752**

For iPad-only assets, put 10 PNGs in `~/Documents/app_ipad/` (same slide order as iPhone).

---

## Figma Make vs Design mode

| Mode | Use for |
|------|---------|
| **Make** (your link) | AI tweaks to layout, colors, headline wording |
| **Edit → Design** | Drop in `slide-01.png`…`slide-10.png`, fine-tune, **Export PNG** |

For App Store upload you must **export PNGs from Design mode** (Make preview alone is not enough).

1. Open your [Figma Make file](https://www.figma.com/make/3jFXJYNTqUKvvQPjOHxgLt/App-Store-Screenshot-Design--Community-?p=f&t=MOqyK6nnmksF5Dem-0)
2. Click **Edit** (top right) to open the full Figma editor
3. Continue with steps below

**Optional Make prompt** (after Edit, or in Make chat):

```
Customize this App Store screenshot pack for "octobetiQ" — dark navy #0A1428, mint accent #00FF9F. 
Sports AI prediction app. Headlines: AI picks, tracked accuracy, 7-day free trial. 
No gambling imagery. No NFL/NBA/Premier League trademark names in marketing text. 
Keep 10 iPhone portrait frames ready for screenshot image fills.
```

---

## 1. Capture raw app screens (simulator)

**Terminal 1 — Metro:**
```bash
cd mobile
EXPO_PUBLIC_HIDE_DEV_UI=true EXPO_PUBLIC_APP_STORE_CAPTURE=true \
set -a && source secrets/app_review_demo.env && set +a
EXPO_PUBLIC_CAPTURE_LOGIN_EMAIL="$VERIFY_DEMO_EMAIL" \
EXPO_PUBLIC_CAPTURE_LOGIN_PASSWORD="$VERIFY_DEMO_PASSWORD" \
npx expo start --dev-client
```

**Terminal 2 — capture:**
```bash
cd mobile
./scripts/capture-app-store-screenshots.sh auth-auto
```

Raw PNGs land in `app-store-screenshots/6.5-inch/` (1284×2778).

---

## 2. Prepare files for Figma

```bash
cd mobile
./scripts/prepare-figma-screenshot-assets.sh
```

Creates `app-store-screenshots/figma-import/`:

| File | App screen |
|------|------------|
| `slide-01.png` | Home — Best Picks |
| `slide-02.png` | Game detail |
| `slide-03.png` | Model accuracy |
| `slide-04.png` | Trending |
| `slide-05.png` | Paywall |
| `slide-06.png` | Favorites |
| `slide-07.png` | Games |
| `slide-08.png` | Leaderboards |
| `slide-09.png` | Landing hero |
| `slide-10.png` | Profile |

---

## 3. Open your Figma file

**Use your copy:** [Figma Make → App Store Screenshot Design](https://www.figma.com/make/3jFXJYNTqUKvvQPjOHxgLt/App-Store-Screenshot-Design--Community-?p=f&t=MOqyK6nnmksF5Dem-0) → **Edit**

Or remix from community: [1649656460910339105](https://www.figma.com/community/file/1649656460910339105)

In the left panel, find **iPhone 6.5"** or **6.7"** portrait frames (~1284×2778 or 1290×2796).

---

## 4. Replace placeholders with your app

For each of the 10 slides (in order above):

1. Select the **phone screen** layer (image fill inside the device mockup)
2. **Fill → Image** → choose matching `slide-0N.png` from `figma-import/`
3. Set image fit to **Fill** or **Crop** so edges align with the mockup
4. Edit **headline / subtitle** text on the template to match octobetiQ (keep generic — no NFL/NBA/Premier League in marketing copy)

**Suggested headlines** (Apple-safe):

| Slide | Headline | Subtitle |
|-------|----------|----------|
| 01 | AI picks with tracked accuracy | Daily confidence-ranked plays |
| 02 | Win Probability · Deep Context | Model read on every matchup |
| 03 | Accuracy You Can Verify | Tracked on finished games |
| 04 | Today's Top Plays | High-confidence discovery |
| 05 | 7 Days Free · Go Premium | Unlimited picks & in-play |
| 06 | Your Leagues. Your Feed. | Personalized Best Picks |
| 07 | Every Match. Every Edge. | Schedules + win probabilities |
| 08 | Compete & Climb | Leaderboards (Premium) |
| 09 | Smarter Sports Predictions | Major competitions worldwide |
| 10 | Your Command Center | Plan, stats & settings |

Brand colors: background `#0A1428`, accent `#00FF9F`.

---

## 5. Export from Figma

1. Select all **10 export frames** (or the parent “iPhone 6.5"” page)
2. Right panel → **Export** → **PNG**, **1x** (or **2x** then downscale if frames are 1290×2796)
3. Target size for App Store Connect **iPhone 6.5" Display**: **1284 × 2778**
4. Save into `mobile/app-store-screenshots/figma-export/`  
   Name in order: `01.png` … `10.png` (or any 10 PNGs sorted alphabetically)

**Figma shortcut:** Select frame → `⌘⇧E` (Export) with PNG preset.

---

## 6. Import into upload folders

```bash
cd mobile
./scripts/import-figma-exports.sh
```

Outputs:

- `app-store-screenshots/6.5-inch/asc-upload/` → App Store Connect iPhone 6.5"
- `app-store-screenshots/ipad-13-inch/asc-upload/` → iPad 13" (letterboxed)

---

## 7. Upload to App Store Connect

[Previews and Screenshots](https://appstoreconnect.apple.com/apps/6762173223/distribution/ios/version/inflight) → drag `asc-upload` PNGs 01→10.

Optional: add `6.5-inch/previews/01-app-preview.mp4` as App Preview.

---

## npm shortcuts

```bash
npm run screenshots:import        # ~/Documents/app_screenshot → asc-upload/
npm run screenshots:figma-prep      # copy captures → figma-import/
npm run screenshots:figma-import    # figma-export/ → asc-upload/
```

Full pipeline (capture + prep):

```bash
npm run screenshots:figma
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Figma frame size ≠ 1284×2778 | Export at 2x and resize in Preview, or use Figma **Export** scale |
| Game detail shows Games list | Re-run capture when API has a game with prediction; use `capture/game/{id}` |
| Text has league trademarks | Edit Figma text only — keep generic marketing |
| iPad sizes | Run `import-figma-exports.sh` (auto letterbox) or duplicate iPad page in Figma |
