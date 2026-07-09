#!/usr/bin/env bash
# Verify widget API returns expected shape (I70). Run against prod or local API.
set -euo pipefail

BASE_URL="${WIDGET_API_BASE:-https://api.octobetiq.com}"
URL="${BASE_URL}/api/v1/feed/widget/top-pick"

echo "GET $URL"
body="$(curl -fsS "$URL")"
echo "$body" | python3 -c "
import json, sys
data = json.load(sys.stdin)
assert 'disclaimer' in data, 'missing disclaimer'
pick = data.get('pick')
if pick is not None:
    for key in ('headline', 'matchup', 'confidence'):
        assert key in pick, f'missing pick.{key}'
    print('OK: widget payload valid (pick present)')
    print('  headline:', pick.get('headline'))
else:
    print('OK: widget payload valid (no pick today)')
print('  disclaimer:', data.get('disclaimer'))
"
