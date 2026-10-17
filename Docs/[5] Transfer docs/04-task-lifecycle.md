# 04 — Task Lifecycle Spec

## Canonical statuses

```
pending
  → in-progress
    → waiting_coordinator_approval
      → completed
      → in-progress          (disapprove / cancel submit)
  → cancelled
cancelled → pending | in-progress   (activate)
```

Also: remove tutor may send `in-progress` / `waiting_coordinator_approval` → `pending`.

## Status meanings

| Status                         | Meaning                                          |
| ------------------------------ | ------------------------------------------------ |
| `pending`                      | Created; no active tutor work (or tutor removed) |
| `in-progress`                  | Tutor assigned and working                       |
| `waiting_coordinator_approval` | Tutor submitted; awaiting coordinator decision   |
| `completed`                    | Coordinator approved delivery                    |
| `cancelled`                    | Task cancelled                                   |

## Transition table

| From                                           | To                             | Actor             | Conditions / side effects                                                                                                                                         |
| ---------------------------------------------- | ------------------------------ | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| —                                              | `pending`                      | Client            | `sendTaskRequest`: price=0, payment_status=`unpaid`, tutor=null; auto-assign coordinator with **lowest active task count** among active coordinators; upload docs |
| —                                              | any allowed                    | Coordinator/Admin | `createTask` may set tutor/price/status                                                                                                                           |
| `pending` / `waiting_coordinator_approval`     | `in-progress`                  | Coordinator/Admin | `assignTutorToTask`: tutor must have role tutor; task must not already have tutor                                                                                 |
| `in-progress` / `waiting_coordinator_approval` | `pending`                      | Coordinator/Admin | `removeTutor`: clear `tutor_id`                                                                                                                                   |
| `in-progress`                                  | `waiting_coordinator_approval` | Tutor             | `submitTask`                                                                                                                                                      |
| `waiting_coordinator_approval`                 | `in-progress`                  | Tutor             | `cancelSubmitTask`                                                                                                                                                |
| `waiting_coordinator_approval`                 | `completed`                    | Coordinator/Admin | `approveTask`: increment tutor `nbDone`                                                                                                                           |
| `waiting_coordinator_approval`                 | `in-progress`                  | Coordinator/Admin | `disapproveTask`                                                                                                                                                  |
| *                                              | `cancelled`                    | Coordinator/Admin | `cancelTask`                                                                                                                                                      |
| `cancelled`                                    | `in-progress`                  | Coordinator/Admin | `activateTask` if tutor present                                                                                                                                   |
| `cancelled`                                    | `pending`                      | Coordinator/Admin | `activateTask` if no tutor                                                                                                                                        |
| *                                              | `completed`                    | Coordinator/Admin | via `updateTaskDetails` when allowed; increments `nbDone`                                                                                                         |

## Client create rules

**Validation**

- `topic` required
- `type` ∈ `assignment`, `tutoring`, `research`, `editing`
- `category` required
- `desc` required
- `deadline` required, after now

**Defaults**

- `status = pending`
- `price = 0`
- `payment_status = unpaid`
- `tutor_id = null`
- `coordinator_id` = least-loaded active coordinator

## Client edit / delete

**Edit (own task):** topic, type, category, desc, deadline (not free status/price takeover).

**Delete:** blocked if the task has **any** payments **or** refunds. On delete, cascade cleanup of related files in storage.

## Coordinator / admin update rules

`updateTaskDetails` validates:

- status ∈ `pending`, `in-progress`, `waiting_coordinator_approval`, `completed`, `cancelled`
- type ∈ assignment/tutoring/research/editing
- payment_status may allow broader set in old code — prefer canonical set in rebuild

**Active revision guard:** cannot change task status away from a completed path while an open revision (`in-revision` or `waiting_coordinator_approval`) exists — except when setting status to `completed` as allowed by product rules. Prefer: block completion while open revision exists (stricter, clearer).

## Assign / remove tutor

**Assign**

1. Target user must be role `tutor`.
2. Reject if task already has `tutor_id`.
3. Set `tutor_id`; if status was `pending` or `waiting_coordinator_approval`, set `in-progress`.

**Remove**

1. Clear `tutor_id`.
2. If status was `in-progress` or `waiting_coordinator_approval`, set `pending`.

## Approve / disapprove

**Approve:** status → `completed`; `tutor.nbDone += 1`.

**Disapprove:** status → `in-progress`.

## Price edits

Coordinator/Admin can edit `price`. After change, **recompute** `payment_status` from net payments (see payments doc).

## `allow_view`

Admin toggle. Controls whether the client can download/view solution files for that task. Default `false`.

## Side effects checklist per transition

| Event         | Side effects                                  |
| ------------- | --------------------------------------------- |
| Client create | Coordinator assignment, File rows, R2 uploads |
| Tutor submit  | Status only (solutions already uploaded)      |
| Approve       | `nbDone++`                                    |
| Delete        | Storage cleanup + DB cascade                  |
| Price edit    | Recalc payment_status                         |

## Sequence — happy path

```
Client creates task (pending, unpaid)
  → Coordinator sets price / assigns tutor (in-progress)
  → Tutor uploads solutions
  → Tutor submits (waiting_coordinator_approval)
  → Coordinator approves (completed, nbDone++)
  → Admin may set allow_view=true
  → Client pays (payment_status → paid when net == price)
  → Client downloads solutions / leaves feedback
```

## Edge cases to implement deliberately

1. Submit with zero solution files — decide allow or block (old app is loose).
2. Approve when tutor is null — should be impossible if assign rules hold.
3. Client pays before completion — allowed today; keep or restrict.
4. Cancel after partial payment — task cancelled but money records remain; delete blocked.
5. Two coordinators — auto-assign by load; admin can reassign.
