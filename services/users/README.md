# Legacy Go user service (not deployed)

This directory is a **scaffold only**. Production auth, users, and subscriptions live in the FastAPI backend:

- `backend/app/api/v1/auth.py`
- `backend/app/api/v1/user.py`
- `backend/app/models/user.py`

Do not deploy or import from `services/users/` in octobetiQ production. See `archive/README.md` for archived Rust/ML experiments.
