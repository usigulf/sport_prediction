# octobetiQ — Complete Execution Plan (Post-Audit)

**Audience:** Solo founder  
**Stack (assumed):** React Native (Expo), Supabase, RevenueCat, Apple App Store, AI prediction models  
**Current codebase note:** Backend is FastAPI + Postgres today. Tasks marked **(Supabase)** apply when/if you migrate auth/storage; keep FastAPI for predictions until cutover is explicit.

**Last updated:** June 2026  
**Source:** Full product audit (PM, UX, security, data science, growth)

---

## Executive Summary (Investor Lens)

**Highest ROI fixes (do these first):**

1. **Ship App Store approval** — build 28, Free app price, metadata compliance, IAP attached (unblocks revenue = $0 until done).
2. **Fix trust math** — pre-kickoff accuracy lock (one bad accuracy number kills retention and invites regulatory scrutiny).
3. **Guest browse** — remove auth wall for schedules + 3 picks (typically +20–40% install→signup in comparable apps).
4. **Hide immature features** — player props, misleading “SHAP,” Pro naming (reduces rejection + refund risk).
5. **Production keys only** — RevenueCat `appl_` key, no test store in release (Apple rejection + $0 IAP).

**Do NOT build before launch:** odds API, widgets, referral program, per-league ML v2, Supabase migration (unless auth is blocking).

**Strategic fork (Day 60):** Choose **Fan Analytics** ($9.99, transparency-led) vs **Serious Pick Tool** ($29.99, requires odds API + audit trail). Current price implies Path B but product is Path A.

---

## Priority Definitions

| Tier | Meaning |
|------|---------|
| **Critical** | Blocks launch, approval, payments, or trust/legal exposure |
| **High** | Major conversion, retention, or credibility impact within 30 days |
| **Medium** | Competitive parity; 30–60 day horizon |
| **Low** | Differentiation; 60–90+ days |

---

## Quick Wins (<1 Day)

| ID | Task |
|----|------|
| QW-01 | Set ASC app price to **Free** (GET button) |
| QW-02 | Fix keywords typo `ports` → `sports` |
| QW-03 | Rename tab **Trending** → **Live** (or retitle screen to Trending) |
| QW-04 | Replace all **Upgrade to Pro** → **Upgrade to Premium** |
| QW-05 | Remove **Stripe** mention from iOS Home teaser |
| QW-06 | Remove **Download on App Store** CTA on native iOS Landing |
| QW-07 | Attach build **28** to version **1.0.0** and submit |
| QW-08 | Rename API/UI **shap_value** → **feature_importance** (copy only) |
| QW-09 | Add data-freshness line on Accuracy screen (“Last updated …”) |
| QW-10 | Premium IAP attached on version page ($29.99) |

---

## Remove Entirely (Until Mature)

| Feature | Reason |
|---------|--------|
| Player props (production UI) | No licensed lines/stats; trust + legal risk |
| “Pro” tier naming | Product is Premium-only; confuses users + ASC |
| Fake “Premium Unlock” overlay on Landing teasers | Deceptive pattern; hurts trust |
| Stripe checkout CTA on iOS primary paths | Violates IAP guidelines if digital content |
| Re-upload builds with semver build numbers | Apple rejects; wasted EAS quota |

---

## Hide Until Mature (feature flag / Premium-only / “Beta” badge)

| Feature | Gate |
|---------|------|
| Challenges | Premium + “Beta” label; hide from Home CTA until >100 MAU |
| Leaderboards | Premium + minimum 50 active users message if empty |
| Player props | `EXPO_PUBLIC_PLAYER_PROPS_ENABLED=false` |
| In-play live probability | Premium + badge “Experimental” until backtested |
| Soccer week/database hint copy | Remove technical Sportradar message from Games |

---

# GitHub Epics

| Epic | Goal | Priority |
|------|------|----------|
| **E1** | App Store launch & compliance | Critical |
| **E2** | Trust & prediction integrity | Critical |
| **E3** | Conversion & onboarding | High |
| **E4** | UX consistency & polish | High |
| **E5** | Security & billing hardening | Critical |
| **E6** | Monetization optimization | High |
| **E7** | Data & ML credibility | High |
| **E8** | Retention & engagement | Medium |
| **E9** | Growth & distribution | Medium |
| **E10** | Platform expansion (Android, widgets) | Low |

---

# Task Backlog (Full Detail)

## CRITICAL — Must Fix Before Launch

### C-01 · Submit App Store build 28 on version 1.0.0
| Field | Detail |
|-------|--------|
| **Description** | Attach **1.0.0 (28)** on ASC version 1.0.0; complete metadata, screenshots, IAP, demo account; **Add for Review**. |
| **Why** | Zero revenue and zero users until approved. |
| **User impact** | App becomes downloadable. |
| **Business impact** | Unblocks entire business. |
| **Difficulty** | Easy |
| **Time** | 2–4 hours |
| **Dependencies** | Screenshots in `asc-upload/`, Premium IAP Ready to Submit |
| **Acceptance criteria** | Version status = Waiting for Review; build 28 attached; iPhone + iPad 10 screenshots each |

### C-02 · Set app price to Free in ASC
| Field | Detail |
|-------|--------|
| **Description** | Pricing and Availability → Price Schedule → **Free** ($0). |
| **Why** | Paid app + IAP confuses users; kills conversion. |
| **User impact** | Button shows **GET** not $29.99. |
| **Business impact** | Higher install volume → more trial starts. |
| **Difficulty** | Easy |
| **Time** | 15 min |
| **Dependencies** | None |
| **Acceptance criteria** | US store preview shows GET + “In-App Purchases” |

### C-03 · Fix ASC metadata (4.1a-safe)
| Field | Detail |
|-------|--------|
| **Description** | Paste copy from `APP_STORE_METADATA_COPY.md`; fix keywords; Terms + Privacy at description end; remove “8 leagues” from promo text. |
| **Why** | Apple rejected 4.1a for league trademarks in marketing. |
| **User impact** | Clearer, compliant listing. |
| **Business impact** | Approval probability ↑ |
| **Difficulty** | Easy |
| **Time** | 1 hour |
| **Dependencies** | None |
| **Acceptance criteria** | No third-party league names in subtitle, promo, description, keywords |

### C-04 · Premium Monthly IAP $29.99 attached to version
| Field | Detail |
|-------|--------|
| **Description** | Subscriptions → Premium Monthly → $29.99, 7-day trial, review screenshot; attach to version In-App Purchases. |
| **Why** | 2.1(b) rejection if IAP not submitted with version. |
| **User impact** | Users can subscribe in app. |
| **Business impact** | Revenue enabled post-approval. |
| **Difficulty** | Easy |
| **Time** | 1–2 hours |
| **Dependencies** | RevenueCat ↔ ASC product linked |
| **Acceptance criteria** | TestFlight purchase sheet shows $29.99 after trial |

### C-05 · Production RevenueCat iOS key in EAS secrets
| Field | Detail |
|-------|--------|
| **Description** | `EXPO_PUBLIC_REVENUECAT_IOS_KEY` = `appl_*` (not `test_*`); rebuild not required for ASC if build 28 already uses production key — verify in EAS env. |
| **Why** | Test Store key = App Review rejection. |
| **User impact** | Real purchases work. |
| **Business impact** | Revenue real, not simulated. |
| **Difficulty** | Easy |
| **Time** | 30 min |
| **Dependencies** | RevenueCat dashboard |
| **Acceptance criteria** | Production build logs show no Test Store warning; offerings load on device |

### C-06 · Pre-kickoff accuracy lock (backend)
| Field | Detail |
|-------|--------|
| **Description** | Store `prediction_type=pre_game` at first prediction before kickoff; accuracy metrics use **only** pre_game rows. Exclude `inplay_v0` from `/stats/accuracy`. |
| **Why** | Inflated/deflated accuracy destroys trust and is indefensible to investors. |
| **User impact** | Accuracy % matches what was shown before games started. |
| **Business impact** | Trust = retention = LTV. |
| **Difficulty** | Medium |
| **Time** | 1–2 days |
| **Dependencies** | DB migration or column on predictions |
| **Acceptance criteria** | Unit tests: live refresh does not change accuracy rollup; API docs updated |

### C-07 · Hide player props in production
| Field | Detail |
|-------|--------|
| **Description** | Feature flag `PLAYER_PROPS_ENABLED=false` in app + API returns 404 or empty for free/production until licensed data. |
| **Why** | Model-only props without lines = misleading. |
| **User impact** | Less clutter; no false precision. |
| **Business impact** | Lower legal/review risk. |
| **Difficulty** | Easy |
| **Time** | 4 hours |
| **Dependencies** | None |
| **Acceptance criteria** | Props tab hidden in Games; Game Detail section absent |

### C-08 · iOS IAP-only for digital subscription (remove Stripe primary on iOS)
| Field | Detail |
|-------|--------|
| **Description** | Paywall on iOS uses RevenueCat only; Stripe web checkout only on web/Android. Remove Stripe copy from iOS Home/Paywall footers. |
| **Why** | Apple 3.1.1 IAP guideline. |
| **User impact** | Native subscribe flow. |
| **Business impact** | Approval + Apple’s 85% rev share path. |
| **Difficulty** | Medium |
| **Time** | 1 day |
| **Dependencies** | C-05 |
| **Acceptance criteria** | iOS audit: no external purchase link for Premium digital content |

### C-09 · Age rating & gambling questionnaire aligned
| Field | Detail |
|-------|--------|
| **Description** | Complete ASC age rating honestly (Gambling = simulated/frequent if applicable); ensure 18+ if required. |
| **Why** | Mismatch triggers rejection or store removal. |
| **User impact** | Correct content rating. |
| **Business impact** | Compliance |
| **Difficulty** | Easy |
| **Time** | 30 min |
| **Dependencies** | None |
| **Acceptance criteria** | Rating matches app content; no surprise flags in review notes |

### C-10 · Demo account verified for App Review
| Field | Detail |
|-------|--------|
| **Description** | Test `appstore-review@octobetiq.com` on iPad + iPhone (password from secure store); Premium tier visible or easy to reach paywall. |
| **Why** | 2.1a iPad sign-in loop was prior rejection. |
| **User impact** | Reviewer can access app. |
| **Business impact** | Approval speed |
| **Difficulty** | Easy |
| **Time** | 1 hour |
| **Dependencies** | Build 28 fixes merged |
| **Acceptance criteria** | Login → MainTabs on iPad simulator without loop |

---

## HIGH PRIORITY (Days 1–30 post-approval or parallel pre-launch)

### H-01 · Guest browse mode (no auth for schedules + 3 picks)
| Field | Detail |
|-------|--------|
| **Description** | Allow unauthenticated access to Landing, Accuracy, Help, **Games list (no predictions)**, and **3 teaser picks/day** on Home feed via public API. |
| **Why** | Auth wall kills top-of-funnel. |
| **User impact** | Try before register. |
| **Business impact** | Install→signup conversion ↑ 20–40% (typical). |
| **Difficulty** | Medium |
| **Time** | 3–5 days |
| **Dependencies** | Backend optional-auth on `/games/upcoming`, rate limit by IP |
| **Acceptance criteria** | Fresh install → see picks without account; register prompt on 4th pick or Game Detail |

### H-02 · Unified Premium naming
| Field | Detail |
|-------|--------|
| **Description** | Replace all “Pro” strings with “Premium”; single tier in UI. |
| **Why** | Cognitive friction; looks unfinished. |
| **User impact** | Clear upgrade path. |
| **Business impact** | Paywall conversion ↑ |
| **Difficulty** | Easy |
| **Time** | 2 hours |
| **Dependencies** | None |
| **Acceptance criteria** | Grep `Pro` in mobile/src — zero user-facing matches except “Profile” |

### H-03 · Rename Trending tab → Live
| Field | Detail |
|-------|--------|
| **Description** | Tab label matches LiveHubScreen purpose. |
| **Why** | Tab/screen mismatch confuses users and support. |
| **User impact** | Predictable navigation. |
| **Business impact** | Lower churn from confusion |
| **Difficulty** | Easy |
| **Time** | 1 hour |
| **Dependencies** | None |
| **Acceptance criteria** | Tab title = Live; deep links updated |

### H-04 · Landing screen native fixes
| Field | Detail |
|-------|--------|
| **Description** | Remove App Store download CTA on iOS; remove fake locked overlays on alternating teaser cards; CTAs → Register only. |
| **Why** | Absurd UX inside the app; feels scammy. |
| **User impact** | Professional first impression. |
| **Business impact** | Conversion ↑, bounce ↓ |
| **Difficulty** | Easy |
| **Time** | 4 hours |
| **Dependencies** | None |
| **Acceptance criteria** | iOS Landing has no store badge; teasers show honest free/locked states |

### H-05 · 3-step onboarding redesign
| Field | Detail |
|-------|--------|
| **Description** | Slide 1: What octobetiQ does. Slide 2: Accuracy/trust. Slide 3: League picker + optional push. Skip allowed. |
| **Why** | League-only onboarding doesn’t activate users. |
| **User impact** | Understand value before paywall. |
| **Business impact** | D1 retention ↑ |
| **Difficulty** | Medium |
| **Time** | 2–3 days |
| **Dependencies** | None |
| **Acceptance criteria** | Analytics: 80%+ complete onboarding; time-to-first-pick < 90s |

### H-06 · Data quality gate — hide low-quality picks
| Field | Detail |
|-------|--------|
| **Description** | When `data_quality_score < 0.45`, don’t show pick in feed (or show “Insufficient data” card). Surface standings sync age. |
| **Why** | Showing 50/50 guesses damages brand. |
| **User impact** | Only credible picks shown. |
| **Business impact** | Trust ↑, support tickets ↓ |
| **Difficulty** | Medium |
| **Time** | 1–2 days |
| **Dependencies** | Backend already has `data_quality_service` |
| **Acceptance criteria** | NFL games without standings don’t show high-confidence picks |

### H-07 · Minimum training data gate for model publish
| Field | Detail |
|-------|--------|
| **Description** | Block `/internal/ml/train` deploy if holdout < 500 decisive games per league group; show “model warming” in API. |
| **Why** | 9-game model is embarrassing and wrong. |
| **User impact** | Honest “collecting data” state. |
| **Business impact** | Investor diligence pass |
| **Difficulty** | Medium |
| **Time** | 1 day |
| **Dependencies** | Historical game ingestion |
| **Acceptance criteria** | `metrics.json` rejects publish below threshold |

### H-08 · Fix explainability labels (no fake SHAP)
| Field | Detail |
|-------|--------|
| **Description** | Rename `shap_value` → `feature_weight`; UI copy “Key factors” not “SHAP analysis”. |
| **Why** | Mislabeling is fraud-adjacent for sophisticated users. |
| **User impact** | Honest analysis section. |
| **Business impact** | Trust, PR safety |
| **Difficulty** | Easy |
| **Time** | 4 hours |
| **Dependencies** | None |
| **Acceptance criteria** | No “SHAP” in user-facing strings |

### H-09 · Apple Sign In
| Field | Detail |
|-------|--------|
| **Description** | Add Sign in with Apple (required if other social login added; best practice for iOS). Wire to Supabase Auth **or** backend OAuth bridge. |
| **Why** | Password friction; Apple guideline if Google added. |
| **User impact** | 1-tap signup. |
| **Business impact** | Signup completion ↑ 15–25% |
| **Difficulty** | Medium |
| **Time** | 2–3 days |
| **Dependencies** | Supabase Auth or backend JWT issuance |
| **Acceptance criteria** | Apple login works on device; reviewer can use demo Apple ID or email fallback |

### H-10 · RevenueCat webhook HMAC / signature verification
| Field | Detail |
|-------|--------|
| **Description** | Verify RevenueCat webhook authorization with constant-time compare; rotate secret; log failures. |
| **Why** | Tier spoofing via fake webhooks. |
| **User impact** | None visible. |
| **Business impact** | Prevents free Premium abuse |
| **Difficulty** | Easy |
| **Time** | 4 hours |
| **Dependencies** | Backend deploy |
| **Acceptance criteria** | Invalid auth returns 401; tests in `test_revenuecat_webhook.py` |

### H-11 · WebSocket auth — remove query token
| Field | Detail |
|-------|--------|
| **Description** | Accept Bearer header only for `/ws/games/{id}/live`; deprecate `?token=`. |
| **Why** | Token leakage via logs/referrers. |
| **User impact** | None if app updated. |
| **Business impact** | Security hygiene |
| **Difficulty** | Easy |
| **Time** | 4 hours |
| **Dependencies** | Mobile WS client update |
| **Acceptance criteria** | Query token rejected in production |

### H-12 · App Preview video on ASC
| Field | Detail |
|-------|--------|
| **Description** | Upload `6.5-inch/previews/01-app-preview.mp4` or record new 15–30s preview. |
| **Why** | +5–15% conversion on listing (Apple data). |
| **User impact** | See app motion before install. |
| **Business impact** | Organic CVR ↑ |
| **Difficulty** | Medium |
| **Time** | 1 day |
| **Dependencies** | `record-app-store-preview.sh` |
| **Acceptance criteria** | Preview live on 6.5" slot |

### H-13 · Paywall pre-auth preview modal on Landing
| Field | Detail |
|-------|--------|
| **Description** | “See Premium features” opens read-only plan comparison (no purchase until register). |
| **Why** | Users want price transparency before account creation. |
| **User impact** | Informed signup. |
| **Business impact** | Trial start quality ↑ |
| **Difficulty** | Easy |
| **Time** | 1 day |
| **Dependencies** | None |
| **Acceptance criteria** | Landing → Premium modal → Register CTA |

### H-14 · Register/Login UX parity (iPad)
| Field | Detail |
|-------|--------|
| **Description** | Register uses same Pressable, KeyboardAvoidingView, min touch targets as Login. |
| **Why** | Prior iPad rejection pattern. |
| **User impact** | Reliable taps on iPad. |
| **Business impact** | Review pass |
| **Difficulty** | Easy |
| **Time** | 4 hours |
| **Dependencies** | None |
| **Acceptance criteria** | Manual iPad test: register flow completes |

### H-15 · Resolution Center reply template
| Field | Detail |
|-------|--------|
| **Description** | Paste build 28 reply from `APP_STORE_SUBMIT_CHECKLIST.md` on resubmission. |
| **Why** | Speeds reviewer understanding. |
| **User impact** | Faster approval. |
| **Business impact** | Days saved |
| **Difficulty** | Easy |
| **Time** | 15 min |
| **Dependencies** | C-01 |
| **Acceptance criteria** | Reply sent with demo credentials |

---

## MEDIUM PRIORITY (Days 31–60)

### M-01 · Odds API integration (v1 — display only)
| Description | Integrate odds provider (e.g. The Odds API, Sportradar Odds) for spread/total/implied prob. |
| Why | Category baseline; justifies subscription. |
| User impact | See model vs market. |
| Business impact | Retention + willingness to pay |
| Difficulty | Hard |
| Time | 1–2 weeks |
| Dependencies | API budget ($50–500/mo), legal review |
| Acceptance criteria | Game Detail shows consensus line + “model edge” badge |

### M-02 · Per-league model training pipeline
| Description | Separate artifacts per league group; auto-fallback to heuristic below sample threshold. |
| Why | Single 9-game global model is not credible. |
| Difficulty | Hard |
| Time | 2 weeks |
| Dependencies | M-07 historical data |
| Acceptance criteria | Each league with 500+ games has own metrics.json |

### M-03 · Push — favorite team kickoff alert
| Description | “Your team plays in 2 hours” + link to Game Detail. |
| Difficulty | Medium |
| Time | 3 days |
| Dependencies | Push tokens, cron |
| Acceptance criteria | Opt-in → receive alert for favorited team |

### M-04 · Push — post-game result vs prediction
| Description | “We predicted X — result Y” notification. |
| Difficulty | Medium |
| Time | 2 days |
| Dependencies | C-06 pre-game lock |
| Acceptance criteria | Notification within 1h of final |

### M-05 · Calibration chart on Accuracy screen
| Description | Reliability diagram (predicted prob vs actual win rate buckets). |
| Difficulty | Medium |
| Time | 3 days |
| Dependencies | C-06 |
| Acceptance criteria | Chart renders with ≥100 scored predictions |

### M-06 · Pick card freshness badge
| Description | “Standings updated 2h ago · Model v1.3” on PredictionCard. |
| Difficulty | Easy |
| Time | 1 day |
| Dependencies | API fields |
| Acceptance criteria | Badge visible on Home + Game Detail |

### M-07 · Historical game backfill job
| Description | Ingest 2+ seasons per league for training/backtest. |
| Difficulty | Hard |
| Time | 1 week |
| Dependencies | Sportradar/ClearSports quotas |
| Acceptance criteria | ≥500 decisive games per major league in DB |

### M-08 · Games flow — tap to detail (skip sheet)
| Description | Single tap → GameDetail; long-press → quick preview sheet. |
| Difficulty | Easy |
| Time | 1 day |
| Dependencies | None |
| Acceptance criteria | User testing: 1 less tap to detail |

### M-09 · Supabase Auth migration plan **(optional)**
| Description | Move auth to Supabase; backend validates Supabase JWT. |
| Difficulty | Hard |
| Time | 1–2 weeks |
| Dependencies | Founder decision |
| Acceptance criteria | Email + Apple login via Supabase; backend accepts token |

### M-10 · Empty states for Leaderboards/Challenges
| Description | “Be the first — Premium feature” instead of blank lists. |
| Difficulty | Easy |
| Time | 4 hours |
| Dependencies | None |
| Acceptance criteria | No empty white screens |

### M-11 · Interstitial ad frequency cap
| Description | Max 1 interstitial per session on Game Detail exit. |
| Difficulty | Easy |
| Time | 4 hours |
| Dependencies | AdMob |
| Acceptance criteria | Session counter respected |

### M-12 · Custom Product Page (CPP) A/B test
| Description | ASC CPP with accuracy-led screenshots vs picks-led. |
| Difficulty | Medium |
| Time | 2 days |
| Dependencies | Approved app |
| Acceptance criteria | 2 CPPs live with analytics |

---

## LOW PRIORITY (Days 61–90)

### L-01 · Referral — 7 extra Premium days
| Difficulty | Medium | Time | 1 week |

### L-02 · iOS Widgets — today’s top pick
| Difficulty | Hard | Time | 2 weeks |

### L-03 · Live Activities for live games
| Difficulty | Hard | Time | 2 weeks |

### L-04 · Paper bet tracker + unit suggestions
| Difficulty | Medium | Time | 1 week |

### L-05 · Android Play Store launch
| Difficulty | Medium | Time | 2 weeks |

### L-06 · Injury/lineup data source
| Difficulty | Hard | Time | 2 weeks |

### L-07 · CLV / line movement v1
| Difficulty | Hard | Time | 2 weeks |

### L-08 · Email weekly digest (Resend/Supabase)
| Difficulty | Medium | Time | 3 days |

### L-09 · In-app NPS + store review prompt
| Difficulty | Easy | Time | 1 day |

### L-10 · Android Google Sign In
| Difficulty | Medium | Time | 2 days |

---

# GitHub Issues (Sample — create in repo)

## Epic E1: App Store Launch

| Issue | Title | Labels |
|-------|-------|--------|
| #101 | Submit v1.0.0 build 28 to App Review | critical, asc |
| #102 | Set ASC price to Free | critical, asc |
| #103 | Update metadata 4.1a-safe | critical, asc |
| #104 | Attach Premium IAP to version | critical, asc |
| #105 | Verify demo account iPad/iPhone | critical, qa |
| #106 | Upload App Preview video | high, asc |

## Epic E2: Trust & Predictions

| Issue | Title | Labels |
|-------|-------|--------|
| #201 | Pre-kickoff prediction lock for accuracy | critical, backend |
| #202 | Hide player props behind feature flag | critical, mobile |
| #203 | Min training sample gate before model deploy | high, ml |
| #204 | Rename SHAP → feature weights | high, backend, mobile |
| #205 | Hide low data-quality picks from feed | high, backend |
| #206 | Calibration chart on Accuracy screen | medium, mobile |

## Epic E3: Conversion

| Issue | Title | Labels |
|-------|-------|--------|
| #301 | Guest browse — 3 picks without auth | high, mobile, backend |
| #302 | 3-step onboarding | high, mobile |
| #303 | Landing iOS CTA fixes | high, mobile |
| #304 | Paywall preview on Landing | high, mobile |
| #305 | Apple Sign In | high, mobile, auth |

## Epic E4: UX Polish

| Issue | Title | Labels |
|-------|-------|--------|
| #401 | Rename Trending → Live | high, mobile |
| #402 | Premium naming cleanup | high, mobile |
| #403 | Register iPad parity | high, mobile |
| #404 | Games tap → direct detail | medium, mobile |
| #405 | Remove technical soccer sync hint | medium, mobile |

## Epic E5: Security & Billing

| Issue | Title | Labels |
|-------|-------|--------|
| #501 | Production RevenueCat key only | critical, mobile |
| #502 | iOS IAP-only (remove Stripe primary) | critical, mobile |
| #503 | RevenueCat webhook hardening | high, backend |
| #504 | WebSocket Bearer-only auth | high, backend, mobile |

---

# Sprints (2-week cadence, solo founder)

## Sprint 1 — **Launch Blockers** (Week 1–2)
**Goal:** App in review or approved.

| Tasks |
|-------|
| C-01, C-02, C-03, C-04, C-05, C-09, C-10, QW-01–QW-10, H-15 |
| H-02, H-03, H-04, H-08, H-14 |
| C-07, C-08 (if build 29+ needed post-quota) |

**Exit criteria:** Waiting for Review or Approved; GET button live.

---

## Sprint 2 — **Trust Foundation** (Week 3–4)
**Goal:** Accuracy is defensible; no misleading features.

| Tasks |
|-------|
| C-06, H-06, H-07, H-10, H-11 |
| Hide Challenges home CTA if empty (M-10) |
| H-12 App Preview |

**Exit criteria:** Accuracy API uses pre_game only; props hidden; webhooks hardened.

---

## Sprint 3 — **Conversion** (Week 5–6)
**Goal:** More users reach first pick and trial.

| Tasks |
|-------|
| H-01 Guest browse |
| H-05 Onboarding v2 |
| H-13 Paywall preview |
| H-09 Apple Sign In (start; finish Sprint 4 if needed) |
| M-06 Freshness badges |

**Exit criteria:** Guest sees 3 picks; onboarding completion >70%.

---

## Sprint 4 — **Retention & Monetization** (Week 7–8)
**Goal:** First paid conversions and re-engagement.

| Tasks |
|-------|
| M-03 Kickoff push |
| M-04 Post-game push |
| M-01 Odds API spike (research + MVP display) |
| M-08 Games navigation |
| L-09 Review prompt |

**Exit criteria:** Push opt-in flow live; 1+ odds field on Game Detail OR decision doc to defer.

---

# 30-Day Launch Plan

| Week | Focus | Deliverables |
|------|-------|--------------|
| **1** | ASC submit | Build 28, Free price, metadata, IAP, screenshots |
| **2** | Approval + hotfix | Review response, iPad/login verify, v1.0.1 only if required |
| **3** | Trust | Pre-kickoff accuracy, hide props, SHAP rename, data quality hide |
| **4** | Conversion v1 | Guest browse, Landing fixes, Live tab rename, Premium naming |

**Day 30 success metrics:**
- App approved and live
- ≥100 installs (organic + friends)
- Signup rate ≥25% of installs
- Zero critical crash rate
- Accuracy page loads <2s

---

# 60-Day Growth Plan

| Week | Focus | Deliverables |
|------|-------|--------------|
| **5** | Onboarding + auth | 3-step onboarding, Apple Sign In |
| **6** | Engagement | Push kickoff + post-game; App Preview live |
| **7** | Data credibility | Historical backfill started; min sample gate enforced |
| **8** | Monetization | Odds display MVP; paywall A/B copy test; review prompts |

**Day 60 success metrics:**
- 500+ installs
- D7 retention ≥15%
- Trial start rate ≥5% of MAU
- Paid conversion ≥2% of trials
- Accuracy methodology documented publicly

---

# 90-Day Roadmap

| Month | Theme | Key outcomes |
|-------|-------|--------------|
| **1** | Launch & trust | Live on App Store; defensible accuracy |
| **2** | Convert & engage | Guest mode; push; Apple Sign In; odds v1 |
| **3** | Scale & differentiate | Per-league models; CPP A/B; referral beta; widget prototype |

**Day 90 success metrics:**
- 2,000+ installs
- 100+ Premium subscribers OR $2k MRR path visible
- D30 retention ≥8%
- Model backtest report publishable to investors

---

# Investor Priority — Largest Quality & Business Value

| Rank | Fix | Value created |
|------|-----|---------------|
| 1 | **Ship approved app (Free + IAP)** | Revenue optionality |
| 2 | **Pre-kickoff accuracy lock** | Due diligence survivable |
| 3 | **Guest browse** | CAC effectively lower |
| 4 | **Hide immature features** | Rejection/refund/chargeback risk ↓ |
| 5 | **Production billing only** | Real revenue |
| 6 | **Odds + edge display** | Category parity; pricing power |
| 7 | **Per-league ML with sample gates** | “AI” claim defensible |
| 8 | **Apple Sign In** | Signup friction ↓ |
| 9 | **Push re-engagement** | D7/D30 retention ↑ |
| 10 | **App Preview + CPP** | Listing CVR ↑ |

---

# Tasks That Can Wait (post-90 days)

- Live Activities, widgets
- Referral program
- Android launch (unless iOS PMF proven)
- Supabase full migration (if current auth works)
- CLV / line movement advanced
- Email digest
- Phased release automation
- Multi-language localization

---

# Master Execution Order (#1–#100)

Execute in this exact order unless blocked by Apple review feedback.

| # | ID | Task |
|---|-----|------|
| 1 | C-02 | Set ASC app price Free |
| 2 | C-03 | Fix ASC metadata (4.1a-safe) |
| 3 | QW-02 | Fix keywords typo |
| 4 | C-04 | Premium IAP $29.99 attached |
| 5 | C-05 | Verify production RevenueCat key in EAS |
| 6 | C-10 | Verify demo account iPad + iPhone |
| 7 | C-01 | Attach build 28 → Submit for Review |
| 8 | H-15 | Resolution Center reply |
| 9 | QW-03 | Rename Trending tab → Live |
| 10 | QW-04 | Pro → Premium naming |
| 11 | QW-05 | Remove Stripe copy iOS Home |
| 12 | QW-06 | Remove App Store CTA on iOS Landing |
| 13 | H-04 | Landing teaser honesty (no fake locks) |
| 14 | C-08 | iOS IAP-only Paywall path |
| 15 | C-07 | Hide player props (feature flag) |
| 16 | QW-08 | Rename SHAP → feature importance (UI) |
| 17 | H-14 | Register iPad UX parity |
| 18 | C-09 | Age rating questionnaire verified |
| 19 | H-02 | Full Premium naming grep cleanup |
| 20 | H-08 | Backend explainability label fix |
| 21 | C-06 | Pre-kickoff accuracy lock |
| 22 | H-06 | Hide low data-quality picks |
| 23 | H-07 | Min training sample gate |
| 24 | H-10 | RevenueCat webhook hardening |
| 25 | H-11 | WebSocket Bearer-only |
| 26 | QW-09 | Accuracy “last updated” line |
| 27 | M-10 | Empty states Leaderboards/Challenges |
| 28 | Hide | Hide Challenges Home CTA until MAU threshold |
| 29 | M-11 | Interstitial frequency cap |
| 30 | H-12 | App Preview video upload |
| 31 | H-01 | Guest browse (3 picks, schedules) |
| 32 | H-13 | Paywall preview modal Landing |
| 33 | H-05 | 3-step onboarding |
| 34 | H-03 | Deep link / screenshot nav Live rename |
| 35 | M-06 | Pick card freshness badge |
| 36 | M-08 | Games tap → direct detail |
| 37 | Remove | Remove technical soccer DB hint |
| 38 | H-09 | Apple Sign In |
| 39 | M-03 | Push favorite team kickoff |
| 40 | M-04 | Push post-game result |
| 41 | M-05 | Calibration chart Accuracy |
| 42 | M-07 | Historical game backfill (start) |
| 43 | M-02 | Per-league model pipeline (design) |
| 44 | M-01 | Odds API vendor selection |
| 45 | M-01 | Odds API MVP display Game Detail |
| 46 | M-02 | Per-league model train + deploy |
| 47 | L-09 | Store review prompt (post-positive session) |
| 48 | M-12 | Custom Product Page A/B |
| 49 | L-08 | Email capture on Landing (optional) |
| 50 | L-04 | Paper bet tracker spec |
| 51 | M-09 | Supabase Auth eval spike |
| 52 | L-01 | Referral program design |
| 53 | L-02 | Widget prototype |
| 54 | L-03 | Live Activities prototype |
| 55 | L-06 | Injury data vendor eval |
| 56 | L-07 | CLV spec document |
| 57 | L-05 | Android store prep |
| 58 | L-10 | Google Sign In (Android) |
| 59 | Analytics | Mixpanel/PostHog event map |
| 60 | Analytics | Funnel: install→guest→signup→trial |
| 61 | Docs | Public methodology page (web) |
| 62 | Docs | Investor metrics dashboard |
| 63 | Ops | EAS build number SOP (integers only) |
| 64 | Ops | ASC screenshot refresh SOP |
| 65 | Legal | Terms update subscription language |
| 66 | Legal | Privacy update AdMob/RevenueCat |
| 67 | QA | Full regression TestFlight checklist |
| 68 | QA | iPad Pro 13" layout pass |
| 69 | UX | Typography pass (consistent sizes) |
| 70 | UX | Empty state illustrations |
| 71 | UX | Error messages human-readable |
| 72 | Backend | Rate limit tuning post-launch |
| 73 | Backend | Redis required prod validation |
| 74 | Backend | Sentry alert rules |
| 75 | ML | Backtest notebook per league |
| 76 | ML | Draw handling training policy |
| 77 | ML | Calibration (Platt/isotonic) |
| 78 | ML | Feature store point-in-time |
| 79 | Growth | ASO keyword experiment |
| 80 | Growth | Reddit/Twitter launch thread |
| 81 | Growth | Product Hunt prep |
| 82 | Support | Help FAQ update post-launch |
| 83 | Support | Crisp/Intercom for support URL |
| 84 | Monetization | Paywall copy A/B (trial vs accuracy) |
| 85 | Monetization | Annual plan ($199) RevenueCat |
| 86 | Monetization | Win-back offer expired subs |
| 87 | Retention | Daily pick push 9am local |
| 88 | Retention | Streak badge (login days) |
| 89 | Retention | Favorite league digest in-app |
| 90 | Community | Challenge invite deep link |
| 91 | Community | Leaderboard share card |
| 92 | Platform | Expo SDK upgrade plan |
| 93 | Platform | RN New Architecture eval |
| 94 | Security | Pen test checklist self-audit |
| 95 | Security | Dependency audit (npm/pip) |
| 96 | Security | SECRET rotation schedule |
| 97 | Data | GDPR delete verification test |
| 98 | Data | Backup/restore drill |
| 99 | Infra | Supabase migration (if approved) |
| 100 | Infra | CDN for static assets / edge cache |

---

# Solo Founder Weekly Rhythm

| Day | Focus |
|-----|-------|
| Mon | Backend + data (1 deep task) |
| Tue | Mobile UX (1 screen flow) |
| Wed | ASC/growth/marketing |
| Thu | Backend + ML |
| Fri | QA + TestFlight + docs |
| Sat | Buffer / catch-up |
| Sun | Plan next sprint; analytics review |

**Rule:** Max **1 Critical + 1 High** in progress at a time. Everything else waits.

---

# Definition of Done (Global)

- [ ] Code merged to main
- [ ] TestFlight build smoke-tested
- [ ] No new Sentry errors
- [ ] Docs updated if user-facing
- [ ] ASC/metadata updated if required
- [ ] Analytics event added if conversion-related

---

*Generated from product audit. Track progress by checking off GitHub issues #101–#504 and master order #1–#100.*

---

## Create GitHub Issues (CLI)

Scripts in repo root `scripts/`:

```bash
# Install once: brew install gh && gh auth login

# Epic E1 only (Sprint 1 launch) — requires gh
./scripts/create-github-issues-e1.sh

# All epics E1–E5 (24 issues + 5 epic trackers) — requires gh
./scripts/create-github-issues-all.sh

# No brew/gh — use GitHub token (https://github.com/settings/tokens/new → repo scope)
export GITHUB_TOKEN=ghp_your_token   # never paste in chat
./scripts/create-github-issues-api-e1.sh      # E1 only (issues 1–7 if repo empty)
./scripts/create-github-issues-api-e2-e5.sh   # E2–E5 (22 issues)
./scripts/create-github-issues-api-all.sh     # E1 + E2–E5 (skip if E1 already exists)
```

Creates labels (`critical`, `asc`, `epic-e1`, `sprint-1`, etc.) and issues with acceptance criteria from this doc.
