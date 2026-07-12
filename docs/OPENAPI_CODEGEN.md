# OpenAPI client codegen (I79 / external audit #11)

Mobile types are generated from the committed OpenAPI schema (prod API has docs disabled).

## Regenerate schema

```bash
python3 backend/scripts/export_openapi.py
```

Writes `docs/openapi.json` (sorted keys, stable formatting).

## Regenerate TypeScript types

```bash
cd mobile
npm run codegen:api
```

Writes `mobile/src/types/api.generated.ts` (do not hand-edit).

## Drift check (CI)

```bash
# Schema vs live FastAPI app
python3 backend/scripts/export_openapi.py --check

# Generated TS vs schema
cd mobile && npm run codegen:api && git diff --exit-code -- src/types/api.generated.ts
```

CI runs both checks on every PR (`backend` + `mobile-typecheck` jobs).

## Required paths

`backend/tests/test_openapi_export.py` asserts the committed schema still includes trust/acceptance routes (model-acceptance, forecast-ledger, CCPA, etc.).
