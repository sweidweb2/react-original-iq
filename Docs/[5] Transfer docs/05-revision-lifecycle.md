# 05 — Revision Lifecycle Spec

## Canonical statuses

```
in-revision
  → waiting_coordinator_approval   (tutor submits)
  → cancelled                      (coordinator/admin cancel)
waiting_coordinator_approval
  → completed                      (approve; set submit_date)
  → in-revision                    (reject OR tutor cancel submit)
  → cancelled
```

## Meanings

| Status | Meaning |
|--------|---------|
| `in-revision` | Open revision; tutor working |
| `waiting_coordinator_approval` | Tutor submitted revision deliverables |
| `completed` | Coordinator approved; `submit_date` set |
| `cancelled` | Session abandoned |

## Invariants

1. **At most one open session** per task where status ∈ `in-revision`, `waiting_coordinator_approval`.
2. Creating a new session is rejected if an open session exists.
3. Revision solutions link through `revision_session_solutions` to `solutions` rows (not client `files`).
4. Task completion should respect open revision (see task lifecycle guard).

## Transition table

| Action | Actor | From | To | Notes |
|--------|-------|------|----|-------|
| Create session | Coordinator/Admin | — | `in-revision` | Set `start_date = now`; title/description/deadline optional |
| Upload revision solutions | Tutor | `in-revision` (implied) | — | Creates Solution + RevisionSessionSolution |
| Submit revision | Tutor | `in-revision` | `waiting_coordinator_approval` | |
| Cancel submission | Tutor | `waiting_coordinator_approval` | `in-revision` | |
| Approve | Coordinator/Admin | `waiting_coordinator_approval` | `completed` | `submit_date = now` |
| Reject | Coordinator/Admin | `waiting_coordinator_approval` | `in-revision` | |
| Cancel session | Coordinator/Admin | open | `cancelled` | |
| Update fields | Coordinator/Admin | * | * | Status updates constrained to allowed set |

## Create validation (recommended)

- Task must exist and be accessible to actor.
- No open revision session.
- Optional: task should be `completed` or at least past first delivery — **product decision** (old code is permissive; document your choice).

## Interaction with task status

| Situation | Expected behavior |
|-----------|-------------------|
| Open revision exists | Do not approve/complete task casually; block conflicting task status changes |
| Revision completed | Task remains in its own status; revision is historical |
| Task cancelled | Prefer cancel open revisions too (improvement vs old app) |

## Data shape per session

```
RevisionSession
  ├── metadata: title, description, dates, status
  └── RevisionSessionSolution[]
        └── Solution (file_location on task)
```

## Sequence — happy path

```
Coordinator creates revision (in-revision)
  → Tutor uploads revision solutions
  → Tutor submits (waiting_coordinator_approval)
  → Coordinator approves (completed + submit_date)
```

## Sequence — reject path

```
Tutor submits → Coordinator rejects → back to in-revision → tutor reworks → resubmit
```

## Known old-app bug (do not copy)

Document upload during revision incorrectly wrote a **File** id into `revision_session_solutions.solution_id` in one path. Rebuild must only link **Solution** ids.

## Acceptance checks

- Cannot create second open session.
- Submit only from `in-revision`.
- Cancel submit only from `waiting_coordinator_approval`.
- Approve sets `submit_date`.
- Reject returns to `in-revision` without losing prior solution files (unless explicitly deleted).
