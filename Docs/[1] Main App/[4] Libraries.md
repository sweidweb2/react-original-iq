# Libraries

Locked testing + quality + UI libs. Paths: `web-app/` · `backend/`

---

## 1. Web (`web-app/`)

### UI

**shadcn/ui** — Vite + Tailwind v4 (components under `src/components/ui/`)

### Core

- React 19 + React Router
- Zustand (client/UI state)
- Zod (form / UX validation)
- Lucide icons

### Testing

- Vitest + React Testing Library
- Playwright (e2e)

```bash
cd web-app
npm run test:unit
npm run test:e2e
```

---

## 2. Backend (`backend/`)

### Core

- Express 5 + TypeScript
- Zod (request validation)
- Helmet + express-rate-limit
- Pino + pino-http
- bcrypt + jsonwebtoken
- `@supabase/supabase-js` (remote DB — wire when ready)

### Testing

- Vitest + Supertest

```bash
cd backend
npm run test:unit
npm run test:integration
```

---

## 3. Repo root

- Prettier
- Husky + lint-staged
