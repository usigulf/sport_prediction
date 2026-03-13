# Octobet: Review & What’s Next

**One-line:** Multi-sport prediction app (Octobet) with auth, games, picks, feed, leaderboards, challenges, and freemium UI — BetQL-aligned architecture (Model Picks, Trending Picks, Best Picks, My Picks).

---

## Quick review

**Working well**

- Auth (register, login, refresh, logout, delete account); navigator switches correctly on auth state.
- Games API (upcoming, by id, league/leagues), predictions with daily limit, feed/top-picks, leaderboards, challenges (create/list/resolve), user/me, favorites, stats/accuracy.
- Mobile: **Tabs** Home, **Trending**, Games, Favorites, Profile. **Games**: sport pills + **Model Picks | Trending Picks | Player Props** (BetQL-style). Game detail: prediction + pick strength (1–5 stars), “Why this prediction?” button, share image, player props (premium), live WebSocket (premium, JWT required). **My Picks** (prediction history), Leaderboards, Challenges (create challenge, list, X/Y correct). **Best Picks for You** on Home; Soccer = Premier League + Champions League. Dark theme, cache, push foundation.
- Security: bcrypt, JWT, rate limits, CORS, account deletion. WebSocket: JWT + premium required for live updates.
- **BetQL alignment:** See `docs/BETQL_ARCHITECTURE_OCTOBET.md` and `docs/BETQL_PHILOSOPHY_FOR_OCTOBET.md`.

**Gaps**

- **Design doc items not built:** Pro plan (second Stripe product), community tips, daily digest push. Onboarding wizard ✅ (first-run league picker).

---

## What’s next (prioritized)

### Phase 1 — Quick wins (1–2 days)

| # | Task | Why |
|---|------|-----|
| 1 | **Theme pass** | Use `theme` in AccuracyScreen and GameDetailScreen (replace #2196F3, #F5F5F5, etc.) so the app feels consistent and maintainable. |
| 2 | **Production config** | Env for `JWT_SECRET`; document CORS for prod; make Redis optional for `/ready` (e.g. skip Redis check if `REDIS_URL` unset) so deploys don’t fail without Redis. |
| 3 | **Error UX** | In ProfileScreen (and similar), surface load failures with a small banner or retry instead of only `console.error`. |

These don’t change product scope but improve polish and deployability.

---

### Phase 2 — Launch blockers (1–2 weeks) — ✅ Done

| # | Task | Status |
|---|------|--------|
| 4 | **Stripe payments** | ✅ Backend: `POST /subscription/create-checkout` (7-day trial), `POST /subscription/webhook` to set `subscription_tier`. Mobile: Paywall “Start 7-day free trial” opens Stripe Checkout; refetch tier on focus. Set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID_PREMIUM`, `STRIPE_WEBHOOK_SECRET` in env. |
| 5 | **Share graphic** | ✅ Backend: Pillow generates PNG (teams, confidence, Octobet); returns `image_base64`. Mobile: save to cache, share via `expo-sharing`; fallback to message-only share. |

With Phase 1 + Phase 2 done, you have a shippable MVP: paid tier and shareable picks.

---

### Phase 3 — Engagement & growth — ✅ Done

| # | Task | Status |
|---|------|--------|
| 6 | **Challenges (minimal)** | ✅ Backend: Challenge model, create/list/get, resolve. Mobile: CreateChallengeScreen, ChallengesScreen list + result (X/Y correct). |
| 7 | **WebSocket auth** | ✅ JWT in query `?token=...`; premium tier required. |
| 8 | **For You feed or onboarding** | “For You” section on Home: top-picks by favorite leagues when logged in. |

---

### Phase 4 — Next (pick one or more)

| # | Task | Why |
|---|------|-----|
| 9 | **Onboarding** | ✅ First-run league picker after login/register; Save syncs to favorites, Skip completes without adding; shown once (AsyncStorage). |
| 10 | **Pro plan (Stripe)** | Second price ID for Pro; currently "Coming soon" on Paywall. |
| 11 | **Docs cleanup** | Single source of truth; archive duplicate architecture docs. |
| 12 | **Daily digest push** | Push "your teams + high-confidence picks"; backend has push-triggers. |
| 13 | **Community tips** | `GET /community/tips` (user-generated, verified) per design. |

---

### Phase 5 — Later (ML, scale, compliance)

- **Live pipeline:** Replace live-prediction and WebSocket stubs with real in-play model/ingestion when data and ML are ready.
- **Per-sport models / drift:** Per ARCHITECTURE_DESIGN; once you have multiple models or live data.
- **Compliance:** Ensure disclaimers, age gates, and region checks match your target markets (design already calls this out).

---

## Suggested order to do next

1. **Done:** Phase 1 (theme, config, error UX), Phase 2 (Stripe, share), Phase 3 (challenges, WebSocket auth, For You).  
2. **Next:** Pick from Phase 4 — e.g. Onboarding, Pro plan, or docs cleanup.
3. **Later:** Phase 5 (live pipeline, per-sport models, compliance).

If you say which phase or task you want to tackle first (e.g. “theme pass” or “Stripe”), the next step can be a concrete implementation plan or code-level changes.
