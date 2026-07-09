# OpenAPI client codegen (I79)

Mobile types are generated from the committed OpenAPI schema (prod API has docs disabled).

## Regenerate schema

```bash
python backend/scripts/export_openapi.py
```

Writes `docs/openapi.json`.

## Regenerate TypeScript types

```bash
cd mobile
npm run codegen:api
```

Writes `mobile/src/types/api.generated.ts` (do not hand-edit).

## CI

`backend/tests/test_openapi_export.py` verifies export runs and includes key paths.
