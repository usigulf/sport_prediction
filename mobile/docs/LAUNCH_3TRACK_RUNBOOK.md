# Launch runbook — ASC 28 · EAS 31 · Push (M-03/M-04)

Three parallel tracks. Do **Track A today** (no new binary). **Track B** after July EAS quota or when ready for 1.0.1. **Track C** is already live on the API — verify on a physical device.

---

## Track A — App Store submit (build **28**, version **1.0.0**)

**Do not wait for build 31.** Use the Complete TestFlight build already uploaded.

| # | Action | Link / path |
|---|--------|-------------|
| 1 | Price **Free** ($0) | [Pricing](https://appstoreconnect.apple.com/apps/6762173223/distribution/pricing) |
| 2 | Version **1.0.0** → Build **+** → **1.0.0 (28)** | [Version](https://appstoreconnect.apple.com/apps/6762173223/distribution/ios/version/inflight) |
| 3 | Screenshots (10 iPhone + 10 iPad) | `mobile/app-store-screenshots/*/asc-upload/` |
| 4 | Metadata | [APP_STORE_METADATA_COPY.md](./APP_STORE_METADATA_COPY.md) |
| 5 | Attach **Premium Monthly** IAP on version page | Ready to Submit |
| 6 | Support + Privacy URLs | `https://octobetiq.com/support` · `https://octobetiq.com/privacy` |
| 7 | App Privacy questionnaire → **Publish** | [Privacy](https://appstoreconnect.apple.com/apps/6762173223/distribution/privacy) |
| 8 | Demo account | `appstore-review@octobetiq.com` / `AppReview2026!` |
| 9 | **Add for Review** → **Submit** | Same version page |

**Pre-flight:** `octobetiq.com/support` and `/privacy` return **200** (with redirects). VPS API deployed through `57d4608`+.

Full detail: [APP_STORE_SUBMIT_CHECKLIST.md](./APP_STORE_SUBMIT_CHECKLIST.md)

---

## Track B — EAS production build **31** (version **1.0.1**)

Includes: M-01 odds UI, calibration chart, Live Picks labels, review prompt, methodology copy.

### 1. Set remote iOS build number (integer only)

EAS remote is currently **33** (auto-incremented after a quota-blocked attempt). Next successful build will be **1.0.1 (33)** unless you reset:

```bash
cd mobile
npx eas-cli build:version:set --platform ios --profile production
# Enter desired integer build number (e.g. 31 or 33 — never 1.0.1)
```

**Quota:** Free iOS builds reset **~July 1, 2026**. If build fails with quota error, wait or upgrade EAS plan.

### 2. Confirm `eas.json` production env

Already set in repo:

- `EXPO_PUBLIC_ODDS_DISPLAY_ENABLED=true`
- `EXPO_PUBLIC_API_URL=https://api.octobetiq.com/api/v1`

Verify EAS secret `EXPO_PUBLIC_REVENUECAT_IOS_KEY` = `appl_…` (not test).

### 3. Build

```bash
cd mobile
npm run eas:build:ios
# or: EAS_NO_VCS=1 npx eas-cli build --platform ios --profile production
```

Expected artifact: **1.0.1 (33)** (or whatever integer you set). After upload, create ASC version **1.0.1**, attach the new build, refresh screenshots if UI changed.

### 4. Optional: submit to TestFlight

```bash
npm run eas:submit:ios
```

---

## Track C — Push M-03 / M-04 (kickoff + post-game)

**Backend:** Implemented in `push_trigger_service.py` — cron every 15 min on VPS.

| Alert | When | Who |
|-------|------|-----|
| **M-03** Kickoff | ~2h before start | Users who favorited team or league |
| **M-04** Post-game | ~1h after estimated final | Same; uses pre-kickoff prediction (C-06) |

**VPS verify:**

```bash
# Cron line (should exist):
# */15 * * * * .../internal_push_triggers_run.sh

cd ~/sport_prediction
./scripts/cron/internal_push_triggers_run.sh
# Expect HTTP 200 JSON: game_reminders_sent, high_confidence_picks_sent, post_game_results_sent
```

**Mobile (build 31+):**

1. Settings → Push notifications **on**, or onboarding step 3 opt-in
2. Add a **favorite team** with a game in the next ~2 hours (kickoff test)
3. After a finished game, favorited users get **Final: …** notification; tap opens Game Detail

**Physical device required** — push does not work in Expo Go (SDK 53+).

---

## Order of operations (recommended)

1. **Today:** Track A (submit 28) — unblocks App Store
2. **Same day:** Track C verify on prod (cron smoke test above)
3. **When quota allows:** Track B (build 31) → ASC 1.0.1 update with odds + calibration UI
