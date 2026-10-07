# Decision — Security Foundation

**Status:** LOCKED  
**Applies to:** `backend/`, `web-app/`

| Concern | Approach |
| --- | --- |
| HTTP headers | Helmet |
| Rate limits | express-rate-limit (API + auth) |
| CORS | Explicit origin allowlist (never `*`) |
| Input | Zod on every external input |
| Passwords | bcrypt |
| Auth | JWT access + refresh |
| Tokens (web) | Zustand persist → localStorage (`original-iq-web-auth`) — UX only |
| SQL / data | Supabase client from repositories only; never from the React app with service role |

Never commit secrets. Put Supabase service role key in `backend/.env` only.
