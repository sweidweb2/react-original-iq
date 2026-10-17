# Original IQ

Tutoring system monorepo: **React web** + **Express API**. Remote **Supabase** later; deploy on **Vercel**.

## Architecture

```
React (web-app) ── REST /api/v1 ──► Express (backend) ──► Supabase (remote)
```

- Business rules and auth live in the backend
- Clients never talk to the database directly
- Layered API: Route → Controller → Service → Repository → Supabase

Source of truth: `Docs/[1] Main App/[1] Tech Stack.md`

## Apps

| App     | Path       | Role                    |
| ------- | ---------- | ----------------------- |
| Web     | `web-app/` | React + TypeScript/Vite |
| Backend | `backend/` | Express + TypeScript    |

## Roles

`SUPER` · `ADMIN` · `TUTOR` · `STUDENT` (register → student)

## Setup

```bash
# Root tooling (Prettier / Husky)
npm install

# API
cd backend
cp .env.example .env
npm install
npm run dev

# Web (other terminal)
cd web-app
cp .env.example .env
npm install
npm run dev
```

- API: `http://localhost:3000/api/v1/health`
- Web: `http://localhost:5173`

Auth works locally with an in-memory store until Supabase env vars are set.

## Scripts

| Command (from app folder) | What             |
| ------------------------- | ---------------- |
| `npm run dev`             | Dev server       |
| `npm run build`           | Production build (web-app; Vercel compiles the backend) |
| `npm run test:unit`       | Unit tests       |
| `npm run typecheck`       | TypeScript check |

Root: `npm run lint` · `npm run format`

## What was removed from Bedrock

Docker / Compose · Prisma · Redis · Cloudflare R2 · mobile app · civil domains (projects, expenses, materials, workers, devices)
