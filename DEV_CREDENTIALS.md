# Dev / test login credentials

Use these only in **development**. Do not use in production.

After running the seed script (`python scripts/seed_data.py` from the project root, with `backend` on PYTHONPATH or run from `backend/`), these users exist:

| Email | Password | Tier |
|-------|----------|------|
| test@example.com | testpass123 | free |
| premium@example.com | premium123 | premium |
| admin@example.com | admin123 | premium_plus |

**If you get "Incorrect email or password":**

1. **Using seed users** — Use one of the emails and passwords above exactly (case-sensitive).
2. **Using your own account** — Register first via the app (Register screen), then log in with that email and password.
3. **No users in DB** — Seed the database so test users exist:
   - From project root: `make seed` (or `cd backend && ./seed.sh` if you have it)
   - Or from backend: `PYTHONPATH=. python ../scripts/seed_data.py`

Ensure the **backend is running** (e.g. `./run.sh` in `backend/`) and the app is pointing at it (e.g. same machine, or `EXPO_PUBLIC_API_URL` set correctly).

**Premium / live WebSocket:** Log in with **premium@example.com** / **premium123** (or **admin@example.com** / **admin123**) to get a user with a premium-style tier. The live game WebSocket (`/ws/live/{game_id}`) only accepts connections when the user’s `subscription_tier` is premium (or trialing/pro). To test without Stripe, use one of these seeded premium accounts.
