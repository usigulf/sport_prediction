# Auditable accuracy scorecard

External audit **#15** — in-app accuracy UI rebuilt as an auditable scorecard, driven by Task 8 acceptance data.

## In-app

`AccuracyScreen` (`mobile/src/screens/AccuracyScreen.tsx`):

| Section | Source |
|---------|--------|
| Invite-beta acceptance gates | `GET /stats/model-acceptance?level=invite_beta` |
| 7d / 30d / all-time windows | `GET /stats/public-audit` (+ `/stats/accuracy` fallback) |
| Calibration chart | `GET /stats/calibration` |
| Model vs closing | `GET /stats/model-vs-closing` |
| League / confidence breakdown | `GET /stats/accuracy` |
| Data coverage | `GET /stats/coverage` |

Copy framing: soccer wedge, pre-kickoff only, **not** betting advice; no performance marketing until `public_charge` passes.

## Web

`web/scorecard.html` — public 7d/30d/all-time from `/stats/public-audit`.

## Related

- `docs/MODEL_ACCEPTANCE_PROTOCOL.md`
- `docs/FORECAST_LEDGER.md`
- `GET /stats/public-audit`
