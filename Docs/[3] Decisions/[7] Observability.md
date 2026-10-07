# Decision — Observability

**Status:** LOCKED  
**Applies to:** `backend/`

| Layer | Choice |
| --- | --- |
| App + HTTP logs | Pino + pino-http → stdout |
| Liveness | `GET /api/v1/health` |
| DB readiness | `GET /api/v1/health/db` (Supabase when configured) |
| Activity / error inbox | Module stubs until Supabase tables exist |

Do not log passwords, tokens, or full PII dumps.
