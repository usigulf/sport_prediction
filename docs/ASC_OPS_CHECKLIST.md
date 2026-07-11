# App Store Connect ops (W36 / I18 / I85)

Manual ASC tasks that cannot be automated from the repo.

---

## §1 Keywords fix (W36 / I18)

**Problem:** Live listing may still show keyword typo `ports` instead of `sports`.

**Fix (5 minutes):**

1. Print canonical keywords:

```bash
./scripts/print_asc_keywords.sh
```

2. App Store Connect → [octobetiQ](https://appstoreconnect.apple.com/apps/6762173223) → **App Information** → **Keywords**  
3. Replace entire field with output (must start with `sports,` — 100 char limit)  
4. **Save** — no new binary required  

Source file: `mobile/app-store-metadata/keywords.txt`

Verify locally:

```bash
./scripts/print_asc_keywords.sh && grep -q '^sports,' mobile/app-store-metadata/keywords.txt && echo OK
```

---

## §2 Privacy nutrition label — quarterly review (I85)

Apple requires the **App Privacy** questionnaire to stay accurate when data practices change.

### Calendar

| Quarter | Suggested week | Action |
|---------|----------------|--------|
| Q1 | January W2 | Review + republish if needed |
| Q2 | April W2 | Review |
| Q3 | July W2 | Review |
| Q4 | October W2 | Review |

Set a recurring calendar invite: **"octobetiQ ASC privacy review"**.

### Review checklist

Compare live app behavior vs last ASC submission:

- [ ] **PostHog** — `EXPO_PUBLIC_POSTHOG_API_KEY` set in production? → Analytics = Yes  
- [ ] **AdMob** — ads on free tier? → Advertising data = Yes  
- [ ] **Email / account** — sign-in, password reset → Contact info = Yes  
- [ ] **Purchases** — RevenueCat → Purchase history = Yes  
- [ ] **Push** — expo-notifications after consent → Device ID / notifications  
- [ ] **ATT** — `expo-tracking-transparency` if ads personalized  

Reference: `mobile/docs/APP_STORE_SUBMIT_CHECKLIST.md` § App Privacy.

### Republish

App Store Connect → **App Privacy** → **Publish** (no app update required unless answers changed materially).

---

## §3 Related ASC tasks

| Task | Doc |
|------|-----|
| Full submit checklist | `mobile/docs/APP_STORE_SUBMIT_CHECKLIST.md` |
| Metadata copy | `mobile/docs/APP_STORE_METADATA_COPY.md` |
| Annual IAP | [ANNUAL_IAP_SETUP.md](./ANNUAL_IAP_SETUP.md) |

---

## Cron reminder (optional, VPS)

Add to crontab (runs 9am UTC on 15th of Jan/Apr/Jul/Oct):

```cron
0 9 15 1,4,7,10 * /root/sport_prediction/scripts/asc_privacy_review_reminder.sh
```

See `scripts/asc_privacy_review_reminder.sh`.
