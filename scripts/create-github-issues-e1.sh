#!/usr/bin/env bash
# Create Epic E1 (App Store Launch) GitHub issues for octobetiQ.
# Requires: gh auth login
# Usage: ./scripts/create-github-issues-e1.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) not found."
  echo ""
  echo "Use the API script instead (no brew/gh):"
  echo "  export GITHUB_TOKEN=ghp_your_token   # https://github.com/settings/tokens/new → repo scope"
  echo "  ./scripts/create-github-issues-api-e1.sh"
  echo ""
  echo "Or install gh: https://cli.github.com/manual/installation"
  exit 1
fi

ensure_label() {
  local name="$1" color="$2" desc="$3"
  gh label create "$name" --color "$color" --description "$desc" --force 2>/dev/null || true
}

ensure_label "critical" "b60205" "Must fix before launch"
ensure_label "high" "d93f0b" "High priority"
ensure_label "asc" "1d76db" "App Store Connect"
ensure_label "qa" "0e8a16" "QA / manual test"
ensure_label "epic-e1" "5319e7" "Epic E1: App Store Launch"
ensure_label "sprint-1" "fbca04" "Sprint 1"

EPIC_URL=""
create_issue() {
  local title="$1"
  local body="$2"
  shift 2
  local url
  url=$(gh issue create --title "$title" --body "$body" "$@")
  echo "Created: $url"
}

EPIC_BODY="$(cat <<'EOF'
# Epic E1: App Store Launch

**Goal:** Get octobetiQ approved and live on the App Store with compliant metadata, Free download, and working Premium IAP.

**Sprint:** 1 (Week 1–2)

**Exit criteria:**
- Version status = Waiting for Review or Approved
- Build 28 attached to version 1.0.0
- App Store listing shows **GET** (Free) + In-App Purchases
- iPhone + iPad screenshots (10 each) uploaded

**Child issues:** #101–#106 (see issues labeled `epic-e1`)

**Docs:**
- `mobile/docs/APP_STORE_SUBMIT_CHECKLIST.md`
- `mobile/docs/APP_STORE_METADATA_COPY.md`
- `mobile/docs/PRODUCT_EXECUTION_PLAN.md`
EOF
)"

echo "Creating Epic E1 tracking issue..."
EPIC_URL=$(gh issue create \
  --title "[Epic E1] App Store Launch" \
  --label "epic-e1,sprint-1,critical" \
  --body "$EPIC_BODY")
echo "Epic: $EPIC_URL"

create_issue \
  "[E1-101] Submit v1.0.0 build 28 to App Review" \
  "$(cat <<'EOF'
## Description
Attach **1.0.0 (28)** on ASC version 1.0.0. Complete screenshots, metadata, IAP, demo account. **Add for Review**.

## Why it matters
Zero revenue until approved.

## User impact
App becomes downloadable.

## Business impact
Unblocks entire business.

## Difficulty / Time
Easy · 2–4 hours

## Dependencies
- Screenshots in `mobile/app-store-screenshots/*/asc-upload/`
- Premium IAP Ready to Submit

## Acceptance criteria
- [ ] Version status = Waiting for Review
- [ ] Build 28 attached
- [ ] iPhone 6.5" + iPad 13" — 10 screenshots each
- [ ] Demo account in App Review Information

## Links
https://appstoreconnect.apple.com/apps/6762173223/distribution/ios/version/inflight
EOF
)" \
  --label "critical,asc,epic-e1,sprint-1"

create_issue \
  "[E1-102] Set ASC app price to Free (GET button)" \
  "$(cat <<'EOF'
## Description
App Store Connect → **Pricing and Availability** → Price Schedule → **Free** ($0.00).

## Why it matters
Paid app + IAP shows $29.99 on download button; kills installs.

## User impact
Store button shows **GET** + "In-App Purchases".

## Business impact
Higher install volume → more trial starts.

## Difficulty / Time
Easy · 15 min

## Acceptance criteria
- [ ] US price = Free
- [ ] Store preview shows GET (not $29.99)

## Links
https://appstoreconnect.apple.com/apps/6762173223/distribution/pricing
EOF
)" \
  --label "critical,asc,epic-e1,sprint-1"

create_issue \
  "[E1-103] Update ASC metadata (4.1a-safe)" \
  "$(cat <<'EOF'
## Description
Paste copy from `mobile/docs/APP_STORE_METADATA_COPY.md`. No league trademarks in subtitle, promo, description, keywords. Terms + Privacy URLs at description end.

## Why it matters
Apple rejected 4.1a for NFL/NBA/Premier League in marketing.

## User impact
Clear, compliant listing.

## Business impact
Approval probability ↑

## Difficulty / Time
Easy · 1 hour

## Acceptance criteria
- [ ] Subtitle ≤30 chars (generic)
- [ ] Keywords: `sports,predictions,...` (not `ports`)
- [ ] Description ends with Terms + Privacy URLs
- [ ] No third-party league names in marketing fields

## Docs
`mobile/docs/APP_STORE_METADATA_COPY.md`
EOF
)" \
  --label "critical,asc,epic-e1,sprint-1"

create_issue \
  "[E1-104] Attach Premium Monthly IAP (\$29.99) to version" \
  "$(cat <<'EOF'
## Description
Subscriptions → Premium Monthly → $29.99/mo, 7-day trial, review screenshot. Version page → In-App Purchases and Subscriptions → add Premium.

## Why it matters
Apple 2.1(b) rejects if IAP not submitted with version.

## User impact
Users can subscribe in app.

## Business impact
Revenue enabled post-approval.

## Difficulty / Time
Easy · 1–2 hours

## Dependencies
RevenueCat ↔ ASC product `com.octobetiq.premium.monthly` linked

## Acceptance criteria
- [ ] IAP status Ready to Submit / Approved
- [ ] Attached to version 1.0.0
- [ ] TestFlight payment sheet shows $29.99 after trial

## Docs
`mobile/docs/SUBSCRIPTION_PRICING_FIX.md`
EOF
)" \
  --label "critical,asc,epic-e1,sprint-1"

create_issue \
  "[E1-105] Verify demo account on iPad and iPhone" \
  "$(cat <<'EOF'
## Description
Test `appstore-review@octobetiq.com` / `AppReview2026!` on iPad + iPhone. Confirm login → MainTabs without loop. Paywall reachable.

## Why it matters
Prior rejection 2.1a: iPad sign-in loop.

## User impact
Reviewer can access app.

## Business impact
Faster approval.

## Difficulty / Time
Easy · 1 hour

## Dependencies
Build 28 on TestFlight

## Acceptance criteria
- [ ] Login works on iPad simulator/device
- [ ] Login works on iPhone
- [ ] No redirect loop after Sign In
- [ ] Credentials match App Review Information in ASC
EOF
)" \
  --label "critical,qa,epic-e1,sprint-1"

create_issue \
  "[E1-106] Upload App Preview video to ASC" \
  "$(cat <<'EOF'
## Description
Upload 15–30s App Preview to iPhone 6.5" slot. Use `mobile/scripts/record-app-store-preview.sh` or existing `6.5-inch/previews/01-app-preview.mp4`.

## Why it matters
+5–15% listing conversion (Apple).

## User impact
See app in motion before install.

## Business impact
Organic CVR ↑

## Difficulty / Time
Medium · 1 day

## Acceptance criteria
- [ ] Preview live on 6.5" Display slot
- [ ] Optional: iPad preview

## Docs
`mobile/docs/APP_STORE_PREVIEW.md`
EOF
)" \
  --label "high,asc,epic-e1,sprint-1"

echo ""
echo "Done. Epic E1 issues created."
echo "Epic tracker: $EPIC_URL"
echo "Link child issues to epic in GitHub Projects or paste URLs into epic body."
