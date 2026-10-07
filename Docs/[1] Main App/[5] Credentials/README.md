# Credentials

Store local secret notes here if needed. This folder is gitignored except this README.

For the app itself, use:

- `backend/.env` — from `backend/.env.example`
- `web-app/.env` — from `web-app/.env.example`

Supabase keys go in `backend/.env` only (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). Never put the service role key in the Vite client.
