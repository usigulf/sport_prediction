# Octobet Home Screen – Improved Layout Plan

## Target layout (top to bottom)

```
┌─────────────────────────────────────────────────────────┐
│ Header: Logo + "Octobet" + "AI Picks That Win More"      │
│         Last updated time                               │
├─────────────────────────────────────────────────────────┤
│ Hero strip: Greeting, headline, trust pills (68%, ★…)   │
├─────────────────────────────────────────────────────────┤
│ Sport filters: [NFL] [NBA] [MLB] [NHL] [Soccer] …       │  ← Feature 2 (existing pills)
├─────────────────────────────────────────────────────────┤
│ BEST PICKS FOR YOU                                      │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  →                 │  ← Feature 1: horizontal carousel
│ │ icon │ │ icon │ │ icon │ │ icon │                     │     (3–5 mini cards)
│ │ LAL  │ │ MCI  │ │ KC   │ │ …    │                     │
│ │ BOS  │ │ ARS  │ │ BUF  │ │      │                     │
│ │ ★★★★ │ │ ★★★★★│ │ ★★★  │ │      │                     │
│ │ ███░ │ │ ████░│ │ ██░░ │ │      │  (win % bar)       │
│ └──────┘ └──────┘ └──────┘ └──────┘                     │
│                                                         │
│ — OR when no picks: "No high-confidence…" + [Browse]   │
├─────────────────────────────────────────────────────────┤
│ TRENDING / HOT RIGHT NOW  🔥                             │  ← Feature 3 (later)
│ [mini] [mini] [mini] [mini]  →                          │
├─────────────────────────────────────────────────────────┤
│ FEATURED GAME (full card + prediction)                  │
├─────────────────────────────────────────────────────────┤
│ LIVE NOW (if any)                                       │
├─────────────────────────────────────────────────────────┤
│ Optional: Your Pick Accuracy 62% | Favorites: 3         │  ← Feature 4 (optional)
├─────────────────────────────────────────────────────────┤
│ Challenge CTA | Premium teaser | Games by league         │
└─────────────────────────────────────────────────────────┘
│ Bottom tab bar                                          │
└─────────────────────────────────────────────────────────┘
```

## Implementation order

1. **Best Picks carousel** – Horizontal FlatList of mini cards (sport icon, matchup, stars, % bar). Replaces vertical stack when picks exist.
2. **Sport filters** – Already present; optional: pass filter to Games tab on tap.
3. **Trending / Hot** – Horizontal scroll of 3–4 teaser picks (fire icon).
4. **User stats widget** – Small row (accuracy %, favorites count) when data available.

## Design constraints

- Background: `#0A1428` (theme.colors.background)
- Accents: green `#00FF9F`, orange for medium confidence
- Safe areas: use `useSafeAreaInsets()` for padding
- Animations: fade-in on load, scale on tap (Animated API; Reanimated if added later)
