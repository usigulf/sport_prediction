# Dev / test login credentials

Use these only in **local development** after seeding the database. **Never use seed passwords in production or App Store Review** — use `scripts/rotate_app_review_demo_account.py` for the review demo account (see `docs/APP_REVIEW_DEMO_ACCOUNT.md`).

After running the seed script (`make seed` or `python scripts/seed_data.py` from the project root):

| Email | Password | Tier |
|-------|----------|------|
| test@example.com | *(see `scripts/seed_data.py` → `SEED_USERS`)* | free |
| premium@example.com | *(see seed script)* | premium |
| admin@example.com | *(see seed script)* | premium_plus |

**If you get "Incorrect email or password":**

1. **Using seed users** — Re-run `make seed` and use the emails above with passwords defined in `scripts/seed_data.py` (local dev only).
2. **Using your own account** — Register via the app, then log in with that email and password.
3. **No users in DB** — From project root: `make seed` (or `cd backend && PYTHONPATH=. python ../scripts/seed_data.py`).

Ensure the **backend is running** and the app points at it (`EXPO_PUBLIC_API_URL` for device/simulator).

**Premium / live WebSocket:** Log in with a seeded **premium** or **admin** tier account to test live updates without Stripe.

**App Store Review:** Credentials live only in gitignored `secrets/app_review_demo.env` after rotation — not in this file.
