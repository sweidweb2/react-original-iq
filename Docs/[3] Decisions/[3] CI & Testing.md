# Decision — CI & Testing

**Status:** LOCKED (local scripts; CI wiring TBD)  
**Applies to:** `web-app/`, `backend/`

| Level | Where |
| --- | --- |
| Unit | Vitest in each app |
| Integration | Backend Supertest |
| E2E | Web Playwright (optional / critical flows) |

No Docker-based test database. Supabase remote / stubs cover DB until schema is ready.
