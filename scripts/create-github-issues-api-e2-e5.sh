#!/usr/bin/env bash
# Create Epic E2–E5 GitHub issues via REST API (no brew/gh required).
# Usage: export GITHUB_TOKEN=ghp_xxx && ./scripts/create-github-issues-api-e2-e5.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

OWNER="${GITHUB_OWNER:-usigulf}"
REPO="${GITHUB_REPO:-sport_prediction}"
TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-}}"

if [[ -z "$TOKEN" ]]; then
  echo "Set GITHUB_TOKEN (new token — never paste in chat):"
  echo "  export GITHUB_TOKEN=ghp_xxx"
  echo "  ./scripts/create-github-issues-api-e2-e5.sh"
  exit 1
fi

API="https://api.github.com/repos/${OWNER}/${REPO}"

gh_api() {
  curl -sS -X "$1" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "${API}$2" \
    "${@:3}"
}

create_issue() {
  local title="$1"
  local payload resp html_url number
  payload=$(python3 -c "import json,sys; print(json.dumps({'title':sys.argv[1],'body':sys.stdin.read(),'labels':[]}))" "$title")
  resp=$(gh_api POST "/issues" -d "$payload")
  html_url=$(echo "$resp" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('html_url',''))" 2>/dev/null || true)
  if [[ -z "$html_url" ]]; then
    echo "API error: $resp" >&2
    exit 1
  fi
  number=$(echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('number',''))")
  echo "Created #${number}: ${html_url}"
}

echo "Repo: ${OWNER}/${REPO}"

# --- Epic E2: Trust & Predictions ---
create_issue "[Epic E2] Trust & Predictions" <<'EOF'
**Labels:** epic-e2, sprint-2, critical

Goal: Defensible accuracy, no misleading features.

**Exit criteria:**
- Pre-kickoff predictions only in accuracy metrics
- Player props hidden in production
- No fake SHAP labeling
- Low data-quality picks hidden

Docs: `mobile/docs/PRODUCT_EXECUTION_PLAN.md` (C-06, H-06–H-08)
EOF

create_issue "[E2-201] Pre-kickoff prediction lock for accuracy" <<'EOF'
**Labels:** critical, backend, epic-e2, sprint-2

## Description
Store `prediction_type=pre_game` at first prediction before kickoff. `/stats/accuracy` excludes `inplay_v0` rows.

## Acceptance criteria
- [ ] DB column or type tag on predictions
- [ ] Accuracy API uses pre_game only
- [ ] Unit tests in `backend/tests/test_stats_trust.py`

Ref: PRODUCT_EXECUTION_PLAN C-06
EOF

create_issue "[E2-202] Hide player props behind feature flag" <<'EOF'
**Labels:** critical, mobile, epic-e2, sprint-2

## Description
`PLAYER_PROPS_ENABLED=false` in prod. Hide Games props tab + Game Detail props section.

## Acceptance criteria
- [ ] No props UI in production builds
- [ ] API returns 404 or empty when disabled

Ref: PRODUCT_EXECUTION_PLAN C-07
EOF

create_issue "[E2-203] Min training sample gate before model deploy" <<'EOF'
**Labels:** high, ml, epic-e2, sprint-2

## Description
Block model publish if holdout < 500 decisive games per league group. Show "model warming" in API when below threshold.

## Acceptance criteria
- [ ] `/internal/ml/train` rejects insufficient data
- [ ] `metrics.json` documents rejection reason

Ref: PRODUCT_EXECUTION_PLAN H-07
EOF

create_issue "[E2-204] Rename SHAP to feature weights" <<'EOF'
**Labels:** high, backend, mobile, epic-e2, sprint-2

## Description
Rename `shap_value` → `feature_weight` in API. UI copy: "Key factors" not "SHAP analysis".

## Acceptance criteria
- [ ] No user-facing "SHAP" strings
- [ ] API field renamed or aliased with deprecation

Ref: PRODUCT_EXECUTION_PLAN H-08
EOF

create_issue "[E2-205] Hide low data-quality picks from feed" <<'EOF'
**Labels:** high, backend, epic-e2, sprint-2

## Description
Hide picks when `data_quality_score < 0.45`. Surface standings sync age on Accuracy screen.

## Acceptance criteria
- [ ] NFL games without standings do not show high-confidence picks in feed
- [ ] Uses existing `data_quality_service.py`

Ref: PRODUCT_EXECUTION_PLAN H-06
EOF

create_issue "[E2-206] Calibration chart on Accuracy screen" <<'EOF'
**Labels:** medium, mobile, epic-e2

## Description
Reliability diagram (predicted prob buckets vs actual win rate) on Accuracy screen.

## Acceptance criteria
- [ ] Chart renders when ≥100 scored predictions
- [ ] Matches backend bucket data

Ref: PRODUCT_EXECUTION_PLAN M-05
EOF

# --- Epic E3: Conversion ---
create_issue "[Epic E3] Conversion & Onboarding" <<'EOF'
**Labels:** epic-e3, sprint-3, high

Goal: Guest browse, onboarding v2, Apple Sign In.

**Exit criteria:**
- 3 picks without account
- 3-step onboarding >70% completion
- Apple Sign In on iOS

Docs: `mobile/docs/PRODUCT_EXECUTION_PLAN.md` Epic E3
EOF

create_issue "[E3-301] Guest browse — 3 picks without auth" <<'EOF'
**Labels:** high, mobile, backend, epic-e3, sprint-3

## Description
Public schedules + 3 teaser picks/day without account. Register prompt on 4th pick or Game Detail.

## Acceptance criteria
- [ ] Fresh install shows picks without login
- [ ] Rate limit by IP on backend

Ref: PRODUCT_EXECUTION_PLAN H-01
EOF

create_issue "[E3-302] 3-step onboarding redesign" <<'EOF'
**Labels:** high, mobile, epic-e3, sprint-3

## Description
Slide 1: value prop. Slide 2: accuracy/trust. Slide 3: league picker + optional push.

## Acceptance criteria
- [ ] Skip allowed
- [ ] Time to first pick < 90s after signup

Ref: PRODUCT_EXECUTION_PLAN H-05
EOF

create_issue "[E3-303] Landing iOS CTA fixes" <<'EOF'
**Labels:** high, mobile, epic-e3, sprint-3

## Description
Remove App Store download badge on iOS native app. Remove fake Premium Unlock overlays on teaser cards.

## Acceptance criteria
- [ ] No App Store badge on iOS Landing
- [ ] Honest free/locked teaser states

Ref: PRODUCT_EXECUTION_PLAN H-04
EOF

create_issue "[E3-304] Paywall preview modal on Landing" <<'EOF'
**Labels:** high, mobile, epic-e3, sprint-3

## Description
"See Premium features" opens read-only plan comparison. Purchase requires register.

## Acceptance criteria
- [ ] Landing → modal → Register CTA flow works

Ref: PRODUCT_EXECUTION_PLAN H-13
EOF

create_issue "[E3-305] Apple Sign In" <<'EOF'
**Labels:** high, mobile, auth, epic-e3, sprint-3

## Description
Sign in with Apple for iOS. Wire to backend JWT or Supabase Auth.

## Acceptance criteria
- [ ] Works on physical device
- [ ] Email/password fallback remains for App Review demo

Ref: PRODUCT_EXECUTION_PLAN H-09
EOF

# --- Epic E4: UX Polish ---
create_issue "[Epic E4] UX Polish" <<'EOF'
**Labels:** epic-e4, sprint-1, high

Goal: Naming consistency, iPad parity, navigation.

Docs: `mobile/docs/PRODUCT_EXECUTION_PLAN.md` Epic E4
EOF

create_issue "[E4-401] Rename Trending tab to Live" <<'EOF'
**Labels:** high, mobile, epic-e4, sprint-1

## Description
Tab label matches LiveHubScreen purpose ("Live Hub").

## Acceptance criteria
- [ ] Tab title = Live
- [ ] Deep links / screenshot scripts updated

Ref: PRODUCT_EXECUTION_PLAN H-03
EOF

create_issue "[E4-402] Premium naming cleanup (remove Pro)" <<'EOF'
**Labels:** high, mobile, epic-e4, sprint-1

## Description
All user-facing "Pro" → "Premium" (except "Profile").

## Acceptance criteria
- [ ] Grep mobile/src for user-facing Pro strings = 0

Ref: PRODUCT_EXECUTION_PLAN H-02
EOF

create_issue "[E4-403] Register iPad UX parity with Login" <<'EOF'
**Labels:** high, mobile, epic-e4, sprint-1

## Description
Register uses Pressable, KeyboardAvoidingView, min 56px touch targets like Login.

## Acceptance criteria
- [ ] iPad register flow completes without dead taps

Ref: PRODUCT_EXECUTION_PLAN H-14
EOF

create_issue "[E4-404] Games tap to direct Game Detail" <<'EOF'
**Labels:** medium, mobile, epic-e4

## Description
Single tap → GameDetail. Long-press → quick preview sheet (optional).

Ref: PRODUCT_EXECUTION_PLAN M-08
EOF

create_issue "[E4-405] Remove technical soccer sync hint from Games" <<'EOF'
**Labels:** medium, mobile, epic-e4

## Description
Remove Sportradar/database technical message from Games screen user copy.

Ref: PRODUCT_EXECUTION_PLAN
EOF

# --- Epic E5: Security & Billing ---
create_issue "[Epic E5] Security & Billing" <<'EOF'
**Labels:** epic-e5, sprint-2, critical

Goal: Production keys, IAP-only iOS, webhook hardening.

Docs: `mobile/docs/PRODUCT_EXECUTION_PLAN.md` Epic E5
EOF

create_issue "[E5-501] Production RevenueCat key only in release" <<'EOF'
**Labels:** critical, mobile, epic-e5, sprint-1

## Description
`EXPO_PUBLIC_REVENUECAT_IOS_KEY` must be `appl_*` in EAS production env. No Test Store key in release.

## Acceptance criteria
- [ ] `eas secret:list` shows appl_ key
- [ ] No Test Store warning on TestFlight build

Ref: PRODUCT_EXECUTION_PLAN C-05
EOF

create_issue "[E5-502] iOS IAP-only — remove Stripe primary on iOS" <<'EOF'
**Labels:** critical, mobile, epic-e5, sprint-1

## Description
Paywall on iOS uses RevenueCat only. Stripe web checkout for web/Android only.

## Acceptance criteria
- [ ] No external purchase link for Premium on iOS
- [ ] Home teaser does not mention Stripe on iOS

Ref: PRODUCT_EXECUTION_PLAN C-08
EOF

create_issue "[E5-503] RevenueCat webhook hardening" <<'EOF'
**Labels:** high, backend, epic-e5, sprint-2

## Description
Constant-time compare on webhook auth header. Log failures. Tests in `test_revenuecat_webhook.py`.

Ref: PRODUCT_EXECUTION_PLAN H-10
EOF

create_issue "[E5-504] WebSocket Bearer-only auth" <<'EOF'
**Labels:** high, backend, mobile, epic-e5, sprint-2

## Description
Remove `?token=` query param for `/ws/games/{id}/live` in production. Bearer header only.

Ref: PRODUCT_EXECUTION_PLAN H-11
EOF

echo ""
echo "Done — 22 issues created (4 epics + 18 tasks)."
echo "View: https://github.com/${OWNER}/${REPO}/issues"
