#!/usr/bin/env bash
# Create Epic E2–E5 GitHub issues for octobetiQ.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if ! command -v gh >/dev/null 2>&1; then
  echo "Install GitHub CLI: https://cli.github.com/"
  exit 1
fi

ensure_label() {
  gh label create "$1" --color "$2" --description "$3" --force 2>/dev/null || true
}

for pair in \
  "backend:0e8a16:Backend" \
  "mobile:1d76db:Mobile app" \
  "ml:5319e7:Machine learning" \
  "auth:c5def5:Authentication" \
  "medium:fbca04:Medium priority" \
  "epic-e2:5319e7:Epic E2 Trust" \
  "epic-e3:1d76db:Epic E3 Conversion" \
  "epic-e4:fbca04:Epic E4 UX" \
  "epic-e5:b60205:Epic E5 Security" \
  "sprint-2:0e8a16:Sprint 2" \
  "sprint-3:d93f0b:Sprint 3" \
  "sprint-4:5319e7:Sprint 4"; do
  IFS=: read -r n c d <<< "$pair"
  ensure_label "$n" "$c" "$d"
done

create_issue() {
  gh issue create --title "$1" --body "$2" "${@:3}"
}

# Epic E2
create_issue "[Epic E2] Trust & Predictions" \
  "Goal: Defensible accuracy, no misleading features. See mobile/docs/PRODUCT_EXECUTION_PLAN.md Epic E2." \
  --label "epic-e2,sprint-2,critical"

create_issue "[E2-201] Pre-kickoff prediction lock for accuracy" \
  "Store prediction_type=pre_game; /stats/accuracy excludes inplay_v0. See C-06 in PRODUCT_EXECUTION_PLAN.md." \
  --label "critical,backend,epic-e2,sprint-2"

create_issue "[E2-202] Hide player props behind feature flag" \
  "PLAYER_PROPS_ENABLED=false in prod. Hide Games props tab + Game Detail section. See C-07." \
  --label "critical,mobile,epic-e2,sprint-2"

create_issue "[E2-203] Min training sample gate before model deploy" \
  "Block model publish if holdout < 500 decisive games per league group. See H-07." \
  --label "high,ml,epic-e2,sprint-2"

create_issue "[E2-204] Rename SHAP → feature weights" \
  "Rename shap_value → feature_weight; UI 'Key factors' not 'SHAP'. See H-08." \
  --label "high,backend,mobile,epic-e2,sprint-2"

create_issue "[E2-205] Hide low data-quality picks from feed" \
  "Hide picks when data_quality_score < 0.45. See H-06." \
  --label "high,backend,epic-e2,sprint-2"

create_issue "[E2-206] Calibration chart on Accuracy screen" \
  "Reliability diagram on Accuracy screen. See M-05." \
  --label "medium,mobile,epic-e2"

# Epic E3
create_issue "[Epic E3] Conversion & Onboarding" \
  "Goal: Guest browse, onboarding v2, Apple Sign In. See PRODUCT_EXECUTION_PLAN.md Epic E3." \
  --label "epic-e3,sprint-3,high"

create_issue "[E3-301] Guest browse — 3 picks without auth" \
  "Public schedules + 3 teaser picks/day without account. See H-01." \
  --label "high,mobile,backend,epic-e3,sprint-3"

create_issue "[E3-302] 3-step onboarding redesign" \
  "Value → trust → leagues + push. See H-05." \
  --label "high,mobile,epic-e3,sprint-3"

create_issue "[E3-303] Landing iOS CTA fixes" \
  "Remove App Store badge on iOS; honest teaser cards. See H-04." \
  --label "high,mobile,epic-e3,sprint-3"

create_issue "[E3-304] Paywall preview modal on Landing" \
  "Read-only Premium comparison before register. See H-13." \
  --label "high,mobile,epic-e3,sprint-3"

create_issue "[E3-305] Apple Sign In" \
  "Sign in with Apple for iOS. See H-09." \
  --label "high,mobile,auth,epic-e3,sprint-3"

# Epic E4
create_issue "[Epic E4] UX Polish" \
  "Goal: Naming consistency, iPad parity, navigation. See PRODUCT_EXECUTION_PLAN.md Epic E4." \
  --label "epic-e4,sprint-1,high"

create_issue "[E4-401] Rename Trending tab → Live" \
  "Tab label matches LiveHubScreen. See H-03." \
  --label "high,mobile,epic-e4,sprint-1"

create_issue "[E4-402] Premium naming cleanup (remove Pro)" \
  "All user-facing Pro → Premium. See H-02." \
  --label "high,mobile,epic-e4,sprint-1"

create_issue "[E4-403] Register iPad UX parity with Login" \
  "Pressable, KeyboardAvoidingView, touch targets. See H-14." \
  --label "high,mobile,epic-e4,sprint-1"

create_issue "[E4-404] Games tap → direct Game Detail" \
  "Single tap to detail; long-press for sheet. See M-08." \
  --label "medium,mobile,epic-e4"

create_issue "[E4-405] Remove technical soccer sync hint from Games" \
  "Remove Sportradar/database message from user-facing copy." \
  --label "medium,mobile,epic-e4"

# Epic E5
create_issue "[Epic E5] Security & Billing" \
  "Goal: Production keys, IAP-only iOS, webhook hardening. See PRODUCT_EXECUTION_PLAN.md Epic E5." \
  --label "epic-e5,sprint-2,critical"

create_issue "[E5-501] Production RevenueCat key only in release" \
  "EXPO_PUBLIC_REVENUECAT_IOS_KEY = appl_* in EAS. See C-05." \
  --label "critical,mobile,epic-e5,sprint-1"

create_issue "[E5-502] iOS IAP-only — remove Stripe primary on iOS" \
  "Paywall uses RevenueCat only on iOS. See C-08." \
  --label "critical,mobile,epic-e5,sprint-1"

create_issue "[E5-503] RevenueCat webhook hardening" \
  "Constant-time auth compare; tests. See H-10." \
  --label "high,backend,epic-e5,sprint-2"

create_issue "[E5-504] WebSocket Bearer-only auth" \
  "Remove ?token= query param in production. See H-11." \
  --label "high,backend,mobile,epic-e5,sprint-2"

echo "Done. Epics E2–E5 issues created."
