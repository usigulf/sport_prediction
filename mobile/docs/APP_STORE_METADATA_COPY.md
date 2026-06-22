# App Store metadata — octobetiQ (4.1a-safe)

Paste into **App Store Connect → App → English (U.S.)**.

**Rules:** No third-party league/team trademarks in subtitle, description, or keywords. End description with Terms + Privacy URLs. Promotional text can be changed anytime without a new build.

---

## Subtitle (30 characters max)

**Recommended:**
```
Daily AI picks · live accuracy
```
(30 chars)

**Alternates:**
```
AI sports insights & picks
Sports analytics · AI picks
Smarter picks. Real accuracy.
```

---

## Promotional Text (170 chars — update anytime)

```
⚡ Daily AI win-probability picks ranked by confidence. See methodology & tracked accuracy in-app. Free tier + 7-day Premium trial. Informational only — not betting advice.
```

**Alternate (trust-led):**
```
Every pick scored against real results. Explore daily AI forecasts, favorites, challenges & in-play updates. Start free — upgrade when you're ready.
```

---

## Keywords (100 characters max, comma-separated, no spaces after commas)

```
sports,predictions,soccer,football,basketball,AI,picks,forecast,analytics,accuracy,stats,insights
```
(99 chars)

---

## Description (paste full block)

```
Smarter game day starts here.

octobetiQ is your AI-powered sports companion — daily win-probability picks, confidence-ranked plays, and tracked accuracy you can actually verify in the app. Built for fans who want insight, not hype.

━━━━━━━━━━━━━━━━━━━━
⚽ WHAT YOU GET
━━━━━━━━━━━━━━━━━━━━

◆ Daily AI picks — ranked by model confidence
◆ Personalized “For You” feed from your favorite competitions
◆ Game detail — win probability, context, and analysis (Premium)
◆ Live score & in-play probability refresh (Premium)
◆ Favorites, push alerts, challenges & leaderboards (Premium)
◆ Model accuracy dashboard — methodology on every finished game

━━━━━━━━━━━━━━━━━━━━
🌍 COVERAGE
━━━━━━━━━━━━━━━━━━━━

Major professional soccer, football, and basketball competitions worldwide — schedules, picks, and rolling accuracy in one place.

━━━━━━━━━━━━━━━━━━━━
✨ FREE VS PREMIUM
━━━━━━━━━━━━━━━━━━━━

FREE — Limited daily picks, home feed, favorites, and ads
PREMIUM — Unlimited picks, full analysis, in-play updates, challenges, leaderboards, ad-free

Try Premium free for 7 days, then $29.99/month. Cancel anytime in iOS Settings → Apple ID → Subscriptions.

━━━━━━━━━━━━━━━━━━━━
🔍 TRANSPARENCY FIRST
━━━━━━━━━━━━━━━━━━━━

We publish tracked model accuracy in the app — not hidden behind marketing claims. Picks are informational and for entertainment & research. This is not a sportsbook and not financial or gambling advice.

━━━━━━━━━━━━━━━━━━━━

Questions? https://octobetiq.com/support

Terms of Use (EULA): https://www.octobetiq.com/terms
Privacy Policy: https://www.octobetiq.com/privacy
```

---

## What's New (for next version update)

```
Welcome to octobetiQ on the App Store!

• Daily AI picks with confidence rankings
• Tracked model accuracy — see how we perform
• Favorites, challenges, and leaderboards
• Premium: unlimited picks, in-play updates & analysis
• 7-day free trial on Premium
```

---

## App Review notes (optional, private)

```
Informational picks only — not a sportsbook. No real-money wagering.
Premium: $29.99/mo, 7-day trial, com.octobetiq.premium.monthly
Demo: appstore-review@octobetiq.com / AppReview2026!
```

---

## Screenshot captions & upload order

Generate **top banner** captions + conversion-first order (full-screen screenshot with headline overlay):

```bash
cd mobile
npm run app-store:captions
```

**Upload from:**
- iPhone: `app-store-screenshots/6.5-inch/asc-upload/`
- iPad: `app-store-screenshots/ipad-13-inch/asc-upload/`

Each slide: navy gradient banner · headline · accent line · subtitle (no device frame).

### Slot order (01 = first image users see)

| Slot | Source screen | Headline | Subtitle |
|------|---------------|----------|----------|
| **01** | Home | AI Picks That Win More | Daily confidence-ranked plays for you |
| **02** | Game detail | Win Probability · Deep Context | See the model's read on every matchup |
| **03** | Model accuracy | Accuracy You Can Verify | Methodology & rolling stats on every finished game |
| **04** | Trending | Today's Top Plays | Discover high-confidence picks fast |
| **05** | Paywall | Start Your 7-Day Free Trial | Premium · unlimited picks & in-play updates |
| **06** | Favorites | Your Leagues. Your Feed. | Personalized Best Picks from favorites |
| **07** | Games | Browse Every Match | Upcoming games with model win probabilities |
| **08** | Leaderboards | Compete on Accuracy | Challenges & leaderboards for Premium |
| **09** | Landing | Smarter Sports Predictions | AI picks across major competitions worldwide |
| **10** | Profile | Your Hub | Accuracy, subscription & account in one place |

Banners use octobetiQ colors (navy `#0A1428` + accent `#00FF9F`). Hero/landing stays generic — no league trademark lists in overlay text.

---

## Quick ASC checklist

- [ ] Subtitle pasted (≤30 chars)
- [ ] Promotional text pasted
- [ ] Full description with Terms + Privacy at bottom
- [ ] Keywords pasted (≤100 chars)
- [ ] Screenshots from `6.5-inch/asc-upload/` + `ipad-13-inch/asc-upload/` (run `npm run app-store:captions`)
- [ ] App preview uploaded (`6.5-inch/previews/01-app-preview.mp4`)
- [ ] Premium Monthly IAP attached to version ($29.99)
