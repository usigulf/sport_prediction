#!/usr/bin/env bash
# Verify accessibility QA scaffold (external audit #16). Does not run simulators.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

for f in \
  docs/ACCESSIBILITY_QA.md \
  mobile/src/navigation/tabAccessibility.ts \
  mobile/src/utils/gameCardAccessibility.ts \
  mobile/src/components/WideContent.tsx \
  mobile/src/constants/theme.ts \
  mobile/src/constants/theme.contrast.test.ts \
  mobile/src/utils/gameCardAccessibility.test.ts \
  mobile/src/navigation/tabAccessibility.test.ts
do
  if [[ ! -f "$f" ]]; then
    echo "FAIL missing $f"
    exit 1
  fi
done

python3 <<'PY'
from pathlib import Path

needles = {
    "mobile/src/navigation/AppNavigator.tsx": ("tabBarAccessibilityLabel",),
    "mobile/src/utils/gameCardAccessibility.ts": ("buildGameCardAccessibilityLabel",),
    "mobile/src/constants/theme.ts": ("maxFontSizeMultiplier", "textMuted"),
    "mobile/src/components/PredictionDisclaimer.tsx": ("maxFontSizeMultiplier",),
    "mobile/src/components/PredictionCard.tsx": ("accessibilityLabel", "accessibilityRole"),
    "mobile/src/screens/HelpScreen.tsx": ("Open Scorecard and methodology",),
    "mobile/src/ads/components/HousePromotionCard.tsx": ("Learn more about Premium",),
    "mobile/src/screens/AccuracyScreen.tsx": ("WideContent", "accuracy-scorecard"),
    "mobile/src/screens/LiveHubScreen.tsx": ("GameCard", "onPress"),
    "docs/ACCESSIBILITY_QA.md": ("VoiceOver", "TalkBack", "Dynamic Type", "tablet"),
}
for path, tids in needles.items():
    text = Path(path).read_text(encoding="utf-8")
    for tid in tids:
        if tid not in text:
            raise SystemExit(f"missing {tid!r} in {path}")
print("OK  a11y scaffold (labels, contrast test, dynamic type, tablet scorecard)")
PY

echo "[a11y-verify] Done."
