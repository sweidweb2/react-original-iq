# Contributing

## Daily flow

1. Work on a feature branch (or `main` if that is your team convention).
2. Keep changes scoped — prefer existing layers and folders.
3. Run checks before opening a PR:

```bash
npm run format:check
npm run lint
npm run typecheck
```

## Apps

| App | Path       | Dev           |
| --- | ---------- | ------------- |
| Web | `web-app/` | `npm run dev` |
| API | `backend/` | `npm run dev` |

## Rules

- Do not add Docker, Prisma, Redis, or a mobile app without an explicit decision.
- Backend: Route → Controller → Service → Repository → Supabase.
- Web: REST only via `services/`.
- Never commit `.env` secrets.
