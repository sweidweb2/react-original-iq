# Decision — Client State (Zustand)

**Status:** LOCKED  
**Applies to:** `web-app/`

Server-state / API cache library remains deferred. This decision covers **client/UI state only**.

## Adopted

| App | Library  | First store                         |
| --- | -------- | ----------------------------------- |
| Web | Zustand 5 | `web-app/src/stores/authStore.ts` |

Default to **local/component state**. Promote to Zustand only when multiple distant screens need the same **client** state.

## What belongs in Zustand

- Auth session flags + current user summary (`user`, tokens, `isHydrated`)
- Cross-screen UI preferences
- Multi-step wizard drafts
- Ephemeral UI shared across distant consumers

## What must NOT go in Zustand

- Full server collections / list caches by default
- Authorization as a security boundary (backend remains authority)
