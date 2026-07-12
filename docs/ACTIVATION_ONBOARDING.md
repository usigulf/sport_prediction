# Free activation onboarding (audit #14)

Reworked first-run path around **favourite → first trusted prediction → scorecard**.

## Auth onboarding (4 steps)

1. Value
2. Trust (Scorecard framing)
3. Favourite leagues (≥1 required to continue; Skip still available) + optional push
4. First trusted pick from `GET /feed/for-you` → opens `GameDetail`

After finish: Home shows a one-shot **Open Scorecard** nudge (`activationStorage`).

## Guest / landing

- Guest banner primary: **See today's free pick** (opens unlocked teaser or scrolls to For You)
- Landing **Get Free Daily Picks** → `MainTabs` (browse) instead of immediate Register

## Analytics

| Event | When |
|-------|------|
| `favourite_selected` | Onboarding leagues saved |
| `first_prediction_opened` | Onboarding / guest banner / home feed |
| `scorecard_opened` | Scorecard screen / nudge / home pills |
| `activation_completed` | User opens Scorecard from nudge |

## Files

- `mobile/src/screens/OnboardingScreen.tsx`
- `mobile/src/utils/activationStorage.ts`
- `mobile/src/screens/HomeScreen.tsx`
- `mobile/src/screens/home/HomeHeroSections.tsx`
- `mobile/src/constants/analyticsEvents.ts`
