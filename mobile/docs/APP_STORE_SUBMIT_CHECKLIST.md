# App Store submit checklist (octobetiQ)

Use this when App Store Connect shows **Unable to Add for Review**.

## 1. Copyright (required on version page)

```
© 2026 octobetiQ. All rights reserved.
```

Use your legal entity name if different (must match Apple Developer account).

---

## 2. Content Rights Information

**App Store Connect → App Information → Content Rights**

| Question | Typical answer for octobetiQ |
|----------|----------------------------|
| Does your app contain, show, or access third-party content? | **Yes** — sports schedules, team names/logos, and prediction data from licensed API providers (e.g. Sportradar / ClearSports). |
| Do you have the necessary rights? | **Yes** — you must actually have API/data licenses in production. |

If you only show your own text/UI with no third-party logos or feeds, you can answer **No**.

---

## 3. App Privacy (Admin only)

**App Store Connect → App Privacy → Get Started** (Account Holder / Admin).

Minimum for a logged-in app with ads + ATT:

1. **Data types** you collect (examples):
   - Email address (account)
   - User ID (account)
   - Product interaction (analytics / ads if used)
   - Advertising data (if AdMob)
2. **Tracking**: set **Yes, we use data for tracking** because the binary includes `NSUserTrackingUsageDescription` and AdMob may use IDFA after ATT consent.
   - Purposes: Third-Party Advertising, Analytics
   - Link data to user: Yes (for signed-in users) / as applicable
3. Publish the privacy questionnaire.

If you do **not** want to declare tracking, you must **remove ATT** from the app and upload a **new build** (see `mobile/src/ads/native/loadGma.ts` and `NSUserTrackingUsageDescription` in Info.plist).

---

## 4. Tracking vs App Privacy (must match binary)

Your build includes:

```xml
NSUserTrackingUsageDescription
```

**Fastest fix (no new build):** In App Privacy, answer that you **track** users (for advertising/analytics as applicable).

**Alternative (new build):** Remove `expo-tracking-transparency` prompt and `NSUserTrackingUsageDescription`, then answer **No** for tracking in App Privacy.

---

## 5. iPad 13-inch screenshots

The app has `supportsTablet: true`, so Apple requires **iPad 13-inch** screenshots (2064×2752).

**Option A — Generate from iPhone shots (quick):**

```bash
cd mobile
./scripts/resize-screenshots-ipad-13.sh
```

Upload PNGs from `mobile/app-store-screenshots/ipad-13-inch/` to **iPad → 13-inch Display**.

**Option B — iPhone-only app (new build):**

Set `"supportsTablet": false` in `app.json`, run `expo prebuild` + new EAS build, then iPad screenshots are not required.

---

## 6. Sign-in for review

See prior message: `appstore-review@octobetiq.com` / `AppReview2026!`

---

## 7. Support URL (live site)

**App Store Connect → App Information → Support URL:** `https://octobetiq.com/support`

**Privacy Policy URL (App Privacy / version, max 255 chars):** `https://octobetiq.com/privacy`

Page source: `web/support.html`. On the server:

```bash
sudo cp web/support.html /var/www/octobetiq/
# Add deploy/nginx-octobetiq-support-snippet.conf to each HTTPS vhost (apex + www if split)
sudo nginx -t && sudo systemctl reload nginx
curl -sI https://octobetiq.com/support   # expect HTTP/2 200
```

---

## Order to fix blockers

1. Copyright field on version page  
2. Content Rights in App Information  
3. App Privacy (Admin) + tracking aligned with ATT  
4. Upload iPad 13-inch screenshots  
5. Submit for review
