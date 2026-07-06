# App Store Review demo account

**Username (public):** `appstore-review@octobetiq.com`  
**Password:** not stored in git — rotate and keep in App Store Connect + local `secrets/` only.

## Rotate after any leak

The old password `AppReview2026!` was committed in docs/scripts and is **invalid**. Rotate before the next App Review submission.

On the **production API host** (with `DATABASE_URL`):

```bash
cd ~/sport_prediction
docker compose exec api python /app/scripts/rotate_app_review_demo_account.py --generate --write-env-file
```

This:

1. Sets a new random password on the `appstore-review@octobetiq.com` user (`subscription_tier=premium`)
2. Writes `/tmp/app_review_demo.env` in the API container, then copy to the host:

```bash
mkdir -p secrets
docker compose cp api:/tmp/app_review_demo.env secrets/app_review_demo.env
chmod 600 secrets/app_review_demo.env
```

Copy the new password from that file into **App Store Connect → App Review Information** (same email).

## Local verify script

```bash
# After rotation, copy secrets/app_review_demo.env from the server to your machine (scp).
set -a && source secrets/app_review_demo.env && set +a
./scripts/verify_pre_asc_prod.sh
```

Or export manually:

```bash
export VERIFY_DEMO_EMAIL=appstore-review@octobetiq.com
export VERIFY_DEMO_PASSWORD='paste-from-secure-store'
./scripts/verify_pre_asc_prod.sh
```

## Screenshot / preview capture (local only)

```bash
set -a && source secrets/app_review_demo.env && set +a
EXPO_PUBLIC_CAPTURE_LOGIN_EMAIL="$VERIFY_DEMO_EMAIL" \
EXPO_PUBLIC_CAPTURE_LOGIN_PASSWORD="$VERIFY_DEMO_PASSWORD" \
  mobile/scripts/record-app-store-preview.sh
```

Never put the password in shell history on shared machines; prefer `source secrets/app_review_demo.env`.

## Tier

Review account should stay **premium** so Apple can reach paywall and premium picks without IAP during review.
