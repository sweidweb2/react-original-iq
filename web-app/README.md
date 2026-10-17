# Original IQ — Web

React + TypeScript (Vite) client for the tutoring system.

```bash
cp .env.example .env
npm install
npm run dev
```

Talks to the Express API at `VITE_API_BASE_URL` (default: same-origin `/api/v1`). In `npm run dev`, Vite proxies `/api` to `http://localhost:3000`; on Vercel the root `vercel.json` routes `/api/*` to the `backend` service.
