#!/usr/bin/env bash
# Create Epic E1 GitHub issues via REST API (no brew/gh required).
# Usage: export GITHUB_TOKEN=ghp_xxx && ./scripts/create-github-issues-api-e1.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

OWNER="${GITHUB_OWNER:-usigulf}"
REPO="${GITHUB_REPO:-sport_prediction}"
TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-}}"

if [[ -z "$TOKEN" ]]; then
  echo "Set GITHUB_TOKEN — see script header or PRODUCT_EXECUTION_PLAN.md"
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

create_issue "[Epic E1] App Store Launch" <<'EOF'
**Labels:** epic-e1, sprint-1, critical

Goal: Get octobetiQ approved and live on the App Store.

**Exit criteria:**
- Build 28 on version 1.0.0
- Free download (GET button)
- Premium IAP attached
- 10 iPhone + 10 iPad screenshots

Docs: `mobile/docs/APP_STORE_SUBMIT_CHECKLIST.md`, `mobile/docs/PRODUCT_EXECUTION_PLAN.md`
EOF

create_issue "[E1-101] Submit v1.0.0 build 28 to App Review" <<'EOF'
**Labels:** critical, asc, epic-e1, sprint-1

## Acceptance criteria
- [ ] Build 28 attached to version 1.0.0
- [ ] iPhone + iPad screenshots (10 each)
- [ ] Add for Review

https://appstoreconnect.apple.com/apps/6762173223/distribution/ios/version/inflight
EOF

create_issue "[E1-102] Set ASC app price to Free (GET button)" <<'EOF'
**Labels:** critical, asc, epic-e1, sprint-1

## Acceptance criteria
- [ ] Pricing and Availability → Free ($0)
- [ ] Store preview shows GET + In-App Purchases

https://appstoreconnect.apple.com/apps/6762173223/distribution/pricing
EOF

create_issue "[E1-103] Update ASC metadata (4.1a-safe)" <<'EOF'
**Labels:** critical, asc, epic-e1, sprint-1

## Acceptance criteria
- [ ] Copy from `mobile/docs/APP_STORE_METADATA_COPY.md`
- [ ] No league trademarks in marketing
- [ ] Keywords start with `sports` (not `ports`)
- [ ] Terms + Privacy URLs at description end
EOF

create_issue "[E1-104] Attach Premium Monthly IAP (29.99 USD) to version" <<'EOF'
**Labels:** critical, asc, epic-e1, sprint-1

## Acceptance criteria
- [ ] Premium Monthly Ready to Submit at $29.99/mo
- [ ] Attached on version In-App Purchases page
- [ ] TestFlight shows $29.99 after trial

Docs: `mobile/docs/SUBSCRIPTION_PRICING_FIX.md`
EOF

create_issue "[E1-105] Verify demo account on iPad and iPhone" <<'EOF'
**Labels:** critical, qa, epic-e1, sprint-1

## Acceptance criteria
- [ ] appstore-review@octobetiq.com login works (password from secure store)
- [ ] No iPad sign-in loop
- [ ] Credentials in App Review Information
EOF

create_issue "[E1-106] Upload App Preview video to ASC" <<'EOF'
**Labels:** high, asc, epic-e1, sprint-1

## Acceptance criteria
- [ ] 15-30s preview on iPhone 6.5" slot
- [ ] Record: `mobile/scripts/record-app-store-preview.sh`

Docs: `mobile/docs/APP_STORE_PREVIEW.md`
EOF

echo ""
echo "Done — 7 issues created."
echo "View: https://github.com/${OWNER}/${REPO}/issues"
