# Home screen layout – Step 1: Best Picks Carousel

## Updated Home layout (high-level)

```
┌─────────────────────────────────────────────────────────┐
│  [Logo] Octobet                    Updated Feb 15, 2:30p │
│         AI Picks That Win More                          │
├─────────────────────────────────────────────────────────┤
│  Hero strip                                             │
│  Good morning · value prop                              │
│  [62% accuracy] [4.9 ★] [12k+ Users]                    │
├─────────────────────────────────────────────────────────┤
│  (optional) User stats widget (Model % · Favorites)     │
├─────────────────────────────────────────────────────────┤
│  Sport pills  [NFL] [NBA] [MLB] [NHL] [Soccer] [Golf]   │
├─────────────────────────────────────────────────────────┤
│  Error banner (if any)                                  │
├─────────────────────────────────────────────────────────┤
│  TOP VALUE TODAY                                        │
│  ★ Best Picks for You                    [See all]      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │ 🏈 NFL   │ │ 🏀 NBA   │ │ ⚾ MLB   │ │ ...      │  ←  │
│  │ Team vs  │ │ Team vs  │ │ Team vs  │ │          │    │
│  │ Team     │ │ Team     │ │ Team     │ │          │    │
│  │ ★★★★☆   │ │ ★★★★★   │ │ ★★★☆☆   │ │          │    │
│  │ ████ 72% │ │ █████ 85%│ │ ███  58% │ │          │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
│       ↑ horizontal scroll, snap, center card scaled up  │
│       Tap → set as Featured Game (main card below)      │
├─────────────────────────────────────────────────────────┤
│  Featured Game (hero card – can be swapped from above)  │
├─────────────────────────────────────────────────────────┤
│  HOT RIGHT NOW · Live · Challenges · Games by league…   │
└─────────────────────────────────────────────────────────┘
```

## Section order (bullet structure)

1. **Header** – Logo, title, update timestamp  
2. **Hero strip** – Greeting, headline, trust pills (accuracy, rating, users)  
3. **User stats widget** (optional, when logged in)  
4. **Sport filters** – Horizontal pills  
5. **Error banner** (conditional)  
6. **Best Picks for You** – **New carousel** (horizontal FlatList, snap, Reanimated scale):
   - When `bestPicks.length > 0`: render `BestPicksCarousel`
   - When empty: existing “No high-confidence picks” + “Browse all games”  
7. **Featured Game** – Main hero card (driven by `featuredGame`; tap in carousel can set it)  
8. **Trending / Hot · Live · Challenge CTA · Premium · Games by league**

## Step 1 scope

- **BestPicksCarousel** only: reusable component with FlatList horizontal, `snapToInterval`, Reanimated scroll-linked scale.
- **Integration**: Replace or wrap current “Best Picks” list with `BestPicksCarousel` when `bestPicks.length > 0`; add `selectedFeaturedId` state so tap on a carousel pick can set the Featured Game.
- **Colors**: `#0A1428` bg, `#F1F5F9`/`#FFFFFF` text, `#22C55E` green, `#EF4444` red, `#60A5FA`/`#FBBF24` accents.
- **Responsive**: Card width from `Dimensions.get('window').width`; shadow/elevation and rounded cards.

---

## Mock data (4–5 picks)

Use this shape for local testing or storybook. Matches `BestPickItem` from `BestPickMiniCard`.

```ts
export const MOCK_BEST_PICKS: BestPickItem[] = [
  {
    id: 'game-1',
    league: 'nfl',
    home_team: { name: 'Kansas City Chiefs' },
    away_team: { name: 'Buffalo Bills' },
    prediction: {
      home_win_probability: 0.72,
      away_win_probability: 0.28,
      confidence_level: 'high',
    },
  },
  {
    id: 'game-2',
    league: 'nba',
    home_team: { name: 'Boston Celtics' },
    away_team: { name: 'Milwaukee Bucks' },
    prediction: {
      home_win_probability: 0.85,
      away_win_probability: 0.15,
      confidence_level: 'high',
    },
  },
  {
    id: 'game-3',
    league: 'mlb',
    home_team: { name: 'Houston Astros' },
    away_team: { name: 'New York Yankees' },
    prediction: {
      home_win_probability: 0.58,
      away_win_probability: 0.42,
      confidence_level: 'medium',
    },
  },
  {
    id: 'game-4',
    league: 'premier_league',
    home_team: { name: 'Manchester City' },
    away_team: { name: 'Arsenal' },
    prediction: {
      home_win_probability: 0.65,
      away_win_probability: 0.35,
      confidence_level: 'high',
    },
  },
  {
    id: 'game-5',
    league: 'golf',
    home_team: { name: 'R. McIlroy' },
    away_team: { name: 'J. Rahm' },
    prediction: {
      home_win_probability: 0.68,
      away_win_probability: 0.32,
      confidence_level: 'medium',
    },
  },
];
```

---

## Dependencies

- **react-native-reanimated** (e.g. `~3.16.0`). Install: `npx expo install react-native-reanimated`.
- **Babel**: If you don’t already have the Reanimated plugin, add it first in `babel.config.js`:
  ```js
  module.exports = function (api) {
    api.cache(true);
    return {
      presets: ['babel-preset-expo'],
      plugins: ['react-native-reanimated/plugin'], // must be last
    };
  };
  ```
- **Imports** in the carousel: `useSharedValue`, `useAnimatedScrollHandler`, `useAnimatedStyle`, `interpolate`, `Extrapolation`, and `Animated.createAnimatedComponent(FlatList)` from `react-native-reanimated`.
