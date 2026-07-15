## Context

Nest `EventBus.publish` does not await handlers. Password finalize was moved to `FinalizeMissingPasswordService` for HTTP consistency. `UserCreatedEvent` is still published; there is no mutating subscriber. README/reto still tell the old story.

## Goals / Non-Goals

**Goals:**

- Evaluator-facing docs describe the real architecture in one skim.
- Living OpenSpec language for “user created event” matches sole-mutator finalize.

**Non-Goals:**

- Changing create HTTP contract or password generation algorithm.
- Dual-mutating event + service.

## Decisions

### D1 — Docs-first (recommended)

1. README: “On create without password, the application finalize path generates/hashes/updates; then `UserCreatedEvent` is published as a domain signal (Nest EventBus does not await handlers — see ADR-0002).”
2. Reto US-11/US-12: mark done with note that password write is application finalize; event handler file is optional audit-only **or** explicitly waived citing Nest await limitation.
3. Spec delta: MODIFIED “User created domain event” / generate requirement wording if still ambiguous.

### D2 — Optional thin listener

If a named `@EventsHandler` file is required for checklist optics: log-only handler, MUST NOT call generate/update. Register in `UsersModule`. No dual mutate.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Evaluator expects Cloud-Function-style event ownership | Point to ADR + Nest EventBus limitation in README |
| Thin listener invites future dual mutate | Comment + test that listener does not call repository update |

## Open Questions

1. Docs-only, or also add non-mutating `@EventsHandler` for checklist optics?
