# App Store Connect metadata (canonical)

Single source of truth for paste-into-ASC fields. Updating here does **not** change the live listing until you paste in App Store Connect.

## Keywords (P1-008)

**File:** `keywords.txt`

**Live fix:** App Store Connect → [octobetiQ](https://appstoreconnect.apple.com/apps/6762173223) → **App Information** → **English (U.S.)** → **Keywords** → replace any value starting with `ports,` with the contents of `keywords.txt`.

Historical typo: `ports,predictions,...` → must be `sports,predictions,...`.

Print for clipboard:

```bash
./scripts/print_asc_keywords.sh
```

## Other copy

Subtitle, description, and promotional text: [../docs/APP_STORE_METADATA_COPY.md](../docs/APP_STORE_METADATA_COPY.md)
