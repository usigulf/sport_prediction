# BetQL Philosophy & Architecture in Octobet

Octobet uses the **exact same core concepts and architecture** as BetQL. We are **information-only** (no betting, no odds); structure, naming, and flows mirror BetQL. For the full screen-by-screen and concept mapping, see **[BETQL_ARCHITECTURE_OCTOBET.md](./BETQL_ARCHITECTURE_OCTOBET.md)**.

---

## 1. Core Concepts We Adopted

| BetQL concept | Octobet adaptation |
|---------------|--------------------|
| **Best Bets (1–5 star value)** | **Best Picks** with **pick strength** 1–5 stars derived from model confidence (high → 5, medium → 3, low → 1). Surfaces “strongest” picks first. |
| **Today’s best bets feed** | **Today’s Best Picks** (top-picks by confidence), **For You** (personalized by favorite leagues). Same idea: prioritized, scannable feed. |
| **Model vs line / value** | We don’t have odds; we use **model confidence** and **explainability** (why this pick). Value = confidence + transparency. |
| **Custom dashboards** | **Favorites** (teams/leagues), **For You** section, **sport selector** (NFL, NBA, Soccer, etc.). One home for all sports. |
| **Clean, data-driven UI** | Dark theme, confidence badges, win probabilities, expected score, “Why this prediction?” — data first, minimal clutter. |
| **Approachable + trustworthy** | Clear labels (High/Medium/Low confidence), star strength, accuracy stats in Profile, shareable pick graphics. |
| **Multi-sport, one app** | Sport pills, Soccer = Premier League + Champions League, Live Hub = today’s picks across sports. |
| **Freemium** | Free tier (daily limit), Premium (unlimited, live updates, full explanations). |

---

## 2. Architecture Philosophy (Aligned)

- **Data-driven presentation**: Every pick shows confidence, win probability, and optional “full analysis” (key factors). No black box.
- **Prioritized feed**: Best Picks / For You ordered by confidence so the best picks surface first (BetQL: “5-star first”).
- **Personalization**: Favorites and For You so the home feed reflects the user’s leagues/teams.
- **Transparency**: Model accuracy in Profile, explanation view per pick, confidence levels and star strength visible at a glance.
- **Single dashboard**: Home + Live Hub + Games + Favorites provide one place for all sports (BetQL-style “custom dashboard” idea).

---

## 3. Where It’s Implemented in Octobet

| Feature | Location |
|--------|----------|
| Pick strength (1–5 stars) | `PredictionCard`, feed cards, game detail |
| Best Picks / Today’s Picks | Home “For You”, Live Hub “Today’s Best Picks” |
| Confidence → stars | `confidence_level` (high/medium/low) → 5 / 3 / 1 stars |
| Full analysis | Game detail → “Why this prediction?” + Key Factors |
| Personalization | For You (favorite leagues), Favorites tab |
| Multi-sport | Sport pills (NFL, NBA, MLB, NHL, Soccer, …), Games screen |
| Accuracy & trust | Profile → Model accuracy, Leaderboards, Challenges |

---

## 4. Naming and Copy (BetQL-Inspired)

- **Best Picks** = our “top value” picks (high confidence, ordered first in feed).
- **Pick strength** = 1–5 stars (5 = strongest confidence, 1 = lowest). We recommend focusing on 3+ stars (same idea as BetQL’s “3-star and above”).
- **Today’s Best Picks** = Live Hub and/or Home section that shows today’s games with predictions, sorted by strength.
- **For You** = personalized Best Picks by favorite leagues (BetQL “custom dashboard” angle).

---

## 5. What We Don’t Copy (By Design)

- **No odds, no lines, no betting**: Octobet is information-only. We don’t compare to “Vegas” or sportsbooks; we show model confidence and explanations.
- **No bet tracker**: We have Prediction History (what you viewed) and Challenges (you vs model), not wagers.
- **No sharp/public data**: We don’t ingest or show betting market data.

We keep BetQL’s **product philosophy** (value, clarity, personalization, trust) and **information architecture** (best picks feed, dashboards, multi-sport), and express it purely as predictions + explanations + engagement (leaderboards, challenges, share).
