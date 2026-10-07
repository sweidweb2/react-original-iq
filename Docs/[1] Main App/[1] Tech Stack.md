# Project Technical Decisions — LOCKED

## 1. Technology Stack

| Area           | Decision                          |
| -------------- | --------------------------------- |
| **Web**        | React + TypeScript (Vite)         |
| **Backend**    | Express + TypeScript              |
| **Database**   | Supabase (remote PostgreSQL)      |
| **API**        | REST `/api/v1`                    |
| **Auth**       | JWT access + refresh tokens       |
| **Validation** | Zod (clients UX; backend authority) |
| **Client state** | Zustand (UI/session only)       |
| **Deployment** | Vercel (web + API)                |

No Docker, Redis, Prisma, or mobile app in this project.

---

## 2. System Architecture

| Area                         | Decision                   |
| ---------------------------- | -------------------------- |
| **Overall Architecture**     | Monolith API + web client  |
| **Backend Architecture**     | Layered Architecture       |
| **Backend Folder Structure** | DDD modules                |
| **API Style**                | REST                       |
| **API Versioning**           | `/api/v1`                  |
| **Frontend Architecture**    | Feature-based              |

---

## 3. High-Level System

```
React Web (web-app/)
        │
        │  REST /api/v1
        ▼
Express + TypeScript (backend/)
        │
        ▼
Remote Supabase (PostgreSQL)
```

---

## 4. Backend flow

```
Route → Controller → Service → Repository → Supabase
```

Zod schemas validate at the HTTP edge before the service runs.

---

## 5. Apps

| App     | Path       | Role                                      |
| ------- | ---------- | ----------------------------------------- |
| Web     | `web-app/` | React tutoring client                     |
| Backend | `backend/` | Express API, auth, business rules, data   |

---

## 6. Roles (tutoring)

`SUPER` · `ADMIN` · `TUTOR` · `STUDENT`

Public register defaults to `STUDENT`.
