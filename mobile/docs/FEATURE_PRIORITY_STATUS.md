# Feature priority order (launch fixes)

Aligned with the product review “Recommended priority order”:

| # | Item | Status |
|---|------|--------|
| 1 | Production billing (Stripe lifecycle webhooks, RC already wired) | **Done** — `customer.subscription.updated/deleted` + checkout metadata |
| 2 | Soccer honest positioning (`BETA_SOCCER_ONLY` fetches all 6 leagues) | **Done** — `soccerBetaFetch.ts` |
| 3 | Hide/label stubs (props tab, live copy, NFL/NBA, demo model banner) | **Done** — Games/GameDetail/PredictionCard |
| 4 | Guest legal links | **Done** — `AuthTrustLinks` → Privacy & Terms on Landing/Login/Register |
| 5 | Challenge detail + draw scoring | **Done** — `ChallengeDetailScreen`, `prediction_correct_vs_result` |
| 6 | AdMob production | **Config** — set `EXPO_PUBLIC_ADMOB_PRODUCTION=true` + EAS secrets before store revenue |
| 7 | Real in-play ML pipeline | **Not started** — largest lift; pre-game WS remains |

**Stripe Dashboard:** add webhook events `customer.subscription.updated` and `customer.subscription.deleted` to the existing endpoint.

**Next incomplete features (one at a time):** see [INCOMPLETE_FEATURES_ROADMAP.md](./INCOMPLETE_FEATURES_ROADMAP.md).
