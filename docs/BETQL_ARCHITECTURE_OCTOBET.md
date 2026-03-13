# BetQL Architecture — Exact Mapping to Octobet

Octobet uses the **same core concepts and architecture** as BetQL. This document is the 1:1 mapping. Octobet is information-only (no odds, no betting); we mirror structure and naming.

---

## 1. BetQL Navigation (Sport-First) → Octobet

| BetQL | Octobet |
|-------|---------|
| **Sport selector** (NBA, NFL, MLB, NHL, NCAAF, NCAAB, Soccer leagues) | **Sport pills** on Home + Games: All, My leagues, NFL, NBA, MLB, NHL, Soccer, Boxing, Tennis, Golf, MMA |
| **League Home** (e.g. NBA Home) | **Games** tab with selected league; first sub-tab = Model Picks (full list) |
| **Model Bets** (algorithm picks for that sport) | **Model Picks** — all upcoming games with our model’s predictions for the selected league |
| **Trending Bets** (best bets of the day for that sport) | **Trending Picks** — today’s best picks (top-picks feed) filtered by selected league |
| **Expert Picks** (sharp/analyst) | *(Stub / future: community or expert picks)* |
| **Player Prop Picks** | **Player Props** — per-game player props (stub in app; shown in Game Detail for premium) |
| **Public Betting** | *(Omitted — no betting)* |
| **Moneyline Picks** | **Win probability** — our model’s home/away win % (shown in Model Picks and Game Detail) |
| **Over/Unders, 1st Half ATS** | **Expected score** and confidence (shown on pick cards; no separate tab) |
| **Line Movement** | **Updates** — prediction “last updated” or model version (in Game Detail / explanation) |
| **News** (per league) | *(Optional later: league news)* |

---

## 2. BetQL Main Sections → Octobet Tabs & Screens

| BetQL | Octobet |
|-------|---------|
| **Home** (sport selector + main dashboard) | **Home** — sport pills, Best Picks for You, Live Now, Featured Game, games by league |
| **Best Bets Dashboard** (primary value feed) | **Best Picks for You** (Home) + **Trending** tab = today’s best picks (Live Hub) |
| **Games** tab per sport (Model / Trending / etc.) | **Games** tab — sport pills then **Model Picks \| Trending Picks \| Player Props** |
| **My Picks** (saved picks, track record) | **My Picks** = Prediction History (picks you’ve viewed) + **Challenges** (you vs model) |
| **Custom Dashboards** | **Favorites** (teams/leagues) + **For You** (personalized Best Picks) |
| **Account / Profile** | **Profile** — tier, Subscription, My Picks, Leaderboard, Challenges, Settings, Help |

---

## 3. Per-Sport Sub-Tabs (BetQL) → Octobet Games Screen

Within **Games**, after selecting a sport/league, BetQL shows:

- **Model Bets** → Octobet: **Model Picks** (list of upcoming games with predictions).
- **Trending Bets** → Octobet: **Trending Picks** (top-picks for that league only).
- **Player Prop Picks** → Octobet: **Player Props** (entry point; content in Game Detail for premium).
- **Moneyline / Over Unders / 1st Half** → Shown on each pick card (win %, expected score); no separate tabs.
- **Line Movement** → Shown in Game Detail as “Full analysis” / model version / last updated.

---

## 4. Core Concepts (Same as BetQL)

| Concept | BetQL | Octobet |
|--------|--------|---------|
| **Best Bets / Best Picks** | Model’s best value, star-rated | **Best Picks** — same idea; star rating 1–5 from confidence |
| **Star rating** | 1–5 (5 = best value vs Vegas) | **Pick strength** 1–5 (5 = high confidence, 1 = low) |
| **Model picks** | Algorithm-generated picks per sport | **Model Picks** — our ML predictions per game/league |
| **Trending** | Best bets of the day per sport | **Trending Picks** — top-picks (by confidence) per league |
| **Game page** | Projections, lines, sharp/public, injuries | **Game Detail** — prediction, win %, expected score, full analysis, player props (premium) |
| **My Picks** | Save pick, track record | **My Picks** (Prediction History) + **Challenges** (track vs model) |
| **Custom dashboard** | Saved views / favorites | **Favorites** + **For You** (personalized Best Picks) |

---

## 5. What We Omit (By Design)

- **Odds / lines / Vegas** — no betting; we show model confidence and explanations only.
- **Public Betting** — no ticket % or handle.
- **Sharp Data / Pro Money** — no betting market data.
- **Sportsbook offers** — no offers or partners.

---

## 6. Screen-by-Screen Summary

| Screen | BetQL equivalent | Content |
|--------|------------------|---------|
| **Home** | Home + Best Bets dashboard | Sport pills, Best Picks for You, Live Now, Featured, games by league |
| **Trending (Live Hub)** | Trending Bets (cross-sport) | Today’s best picks & upcoming games |
| **Games** | Games tab (per sport) | Sport pills → **Model Picks \| Trending Picks \| Player Props** |
| **Game Detail** | Game page | Prediction, stars, win %, expected score, full analysis, player props (premium), live updates (premium) |
| **Favorites** | Custom dashboards / favorites | Favorite teams & leagues, upcoming games for them |
| **Profile** | Account | Tier, Subscription, **My Picks** (Prediction History), Leaderboard, Challenges, Settings, Help |
| **My Picks (Prediction History)** | My Picks | Picks you’ve viewed (and optionally save) |
| **Challenges** | Track record / vs model | Create challenge (pick N games), see model’s result (X/Y correct) |

This is the **exact same** core concepts and architecture as BetQL, expressed for an information-only product.
