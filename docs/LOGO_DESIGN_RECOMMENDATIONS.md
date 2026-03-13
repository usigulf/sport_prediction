# Octobet Logo Design Recommendations

## Brand context
- **Name:** Octobet = *Octopus* + *Bet* — smart, many “arms” (data/leagues), AI picks.
- **Product:** AI-powered sports predictions (information-only, premium sports-tech).
- **Theme:** Dark navy (#0A1428), neon green accent (#00FF9F), clean and trustworthy.

---

## Design directions (pick one to push further)

### 1. **Abstract octopus mark (recommended)**
- Simple shape: **“O” or circle** that suggests an octopus head, with **3–4 curved “arms”** (not literal tentacles) forming a compact mark.
- Works as icon + wordmark; reads as “smart / data / many inputs” without looking cartoon.
- **Use case:** App icon, header 48×48, favicon. Stays clear at small sizes.

### 2. **Letter mark “O”**
- Bold **“O”** (or “O” + “B” ligature) with a slight tech/sport edge (e.g. angled cut, motion line, or gradient).
- Optional: small octopus detail inside the O (single tentacle, dot eyes) so it’s still on-brand.
- **Use case:** Strong for “Octobet” wordmark lockup; icon can be the O alone.

### 3. **Mascot-lite**
- Stylized octopus head (round body + 2–3 visible arms), **minimal and geometric** (circles, curves), not cute/cartoon.
- Single accent color (e.g. neon green #00FF9F on dark) so it fits the app bar and splash.
- **Use case:** App icon and header; avoid too much detail so it scales down well.

### 4. **Data / AI cue**
- Octopus implied by **nodes and connections** (network graph) or **chart line** that subtly forms an “O” or tentacle.
- Signals “AI / data / predictions” while keeping the Octobet name tie-in.
- **Use case:** More “product” than mascot; good for web and marketing.

---

## Style rules (for any direction)

| Do | Avoid |
|----|--------|
| 1–2 colors (e.g. white/light gray + accent green) | More than 3 colors; busy gradients |
| Works on dark (#0A1428) and light (splash/loading) | Marks that need a specific background to read |
| Recognizable at 24px and 192px | Fine lines, tiny details, thin strokes |
| Simple, geometric shapes | Literal, cartoon octopus; clip art look |
| Slightly rounded (friendly but pro) | Overly sharp or playful only |

---

## Technical specs for implementation

- **App icon:** 1024×1024 px (no transparency for iOS); safe zone ~80% center.
- **Header (current):** 48×48 px — keep mark centered, minimal padding.
- **Formats:** PNG with transparency for in-app; SVG for web and scaling.
- **Colors to provide to designer:**  
  - Primary: `#00FF9F` (neon green)  
  - On dark: `#FFFFFF` or `#F1F5F9`  
  - Dark bg: `#0A1428`

---

## Where to get a logo

1. **Designer (best control):** Fiverr, 99designs, or a local designer — give them this doc + your theme.
2. **DIY:** Figma/Sketch — use the “abstract O + arms” idea and export PNG/SVG.
3. **AI image gen:** Use a prompt like: “Minimal app icon, abstract octopus symbol, single color neon green on transparent, geometric, tech, no text” and refine; then simplify in a vector tool for crisp edges.
4. **Icon font / asset:** If you only need a temporary mark, a simple “O” or abstract shape from a premium icon set, tinted with your green, can work until you commission a final logo.

---

## Implementation (current)

- **Text lockup in app:** “O” in accent green (#00FF9F) + “ctobet” in white is used on Home, Login, and Profile.
- **Reusable component:** `mobile/src/components/OctobetWordmark.tsx` — variants: `header` (28px), `title` (32px, centered), `small` (24px). Use `<OctobetWordmark variant="header" />` (and optional `style`) for consistent branding.
- **Concept icon:** `octobet-logo-concept.png` (abstract octopus mark, neon green) was generated for reference; copy to `mobile/assets/images/` and reference in code if you want to try an image logo or app icon.

## Quick win (no new asset)

If you want an instant refresh without a new image file:
- Use a **text-only lockup:** “Octobet” in a strong sans (e.g. 700 weight) with the “O” in accent green and the rest in white. No image required; works in header and splash until you have a final mark. *(Already implemented via OctobetWordmark.)* Home, Profile, and Login already use this wordmark in the app.

**Using the concept icon:** Copy `octobet-logo-concept.png` into `mobile/assets/images/`. In `app.json` add `"icon": "./assets/images/octobet-logo-concept.png"` for the app icon (resize to 1024x1024 for best results).
