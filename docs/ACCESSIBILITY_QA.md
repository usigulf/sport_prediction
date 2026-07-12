# Accessibility QA (audit #16)

VoiceOver / TalkBack, Dynamic Type, contrast, and tablet QA for the soccer-wedge critical path.

## Scope

| Area | Status |
|------|--------|
| Tab VoiceOver labels | Shipped (`tabAccessibility.ts`) |
| Game / pick card composite labels | Shipped (`gameCardAccessibility.ts`) |
| Touch targets (`minTouchSize` 56) | Shipped |
| Contrast tokens (AA on navy/card) | Jest-gated (`theme.contrast.test.ts`) |
| Dynamic Type cap | `theme.maxFontSizeMultiplier` + disclaimer |
| Tablet centering | `WideContent` / `useLayout` on main tabs + Scorecard |
| Manual VO/TalkBack pass | Checklist below (simulator/AVD) |

## Critical path (pass/fail)

1. Age gate → Privacy consent → Home
2. Guest: See today's free pick → Game detail
3. Auth onboarding: leagues → first pick → Scorecard nudge
4. Tabs: Home / Games / Live / Favorites / Profile (or guest Account)
5. Paywall: plan cards, restore
6. Scorecard: windows + acceptance gates
7. Settings: privacy toggles

**Pass:** every control announces a useful name/role; focus order is logical; no clipped primary labels at largest Dynamic Type; tablet widths ≥768 show centered content without cramped columns.

## Simulator / emulator scripts

### iOS VoiceOver

```bash
# Xcode → Open Developer Tool → Accessibility Inspector
# Or Simulator: Settings → Accessibility → VoiceOver
# Exercise the critical path above.
```

### Android TalkBack

```bash
# Emulator Settings → Accessibility → TalkBack
# Same critical path.
```

### Dynamic Type

- iOS: Settings → Accessibility → Display & Text Size → Larger Text
- Android: Settings → Display → Font size / Display size
- Confirm Home, Paywall, Scorecard, Game detail still scroll and CTAs remain tappable.

### Tablet

- iPad Pro / Android tablet AVD (≥768 logical width)
- Confirm Home, Games, Live Hub, Paywall, Profile, Scorecard use centered max-width content.

## Contrast

Primary tokens must meet WCAG AA (≥4.5:1) for text on `background` and `backgroundCard`. Enforced by:

```bash
cd mobile && npm test -- --testPathPattern=theme.contrast --no-coverage
```

## Scaffold verify

```bash
bash scripts/verify_a11y_scaffold.sh
```

Wired into `scripts/verify_audit_scaffolds.sh`.

## Known exceptions

- Calibration chart is visual; buckets have text fallbacks nearby.
- House promo surface id is hidden from screen readers (marketing slot).
- Full device-lab gesture coverage for Challenges/Leaderboards is deferred.

## Related

- `docs/ACCURACY_SCORECARD.md`
- `docs/ACTIVATION_ONBOARDING.md`
- Matrix: W17, I34, I69
