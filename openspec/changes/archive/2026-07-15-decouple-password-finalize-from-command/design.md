## Context

Post-remediation, `CreateUserHandler` awaits `GeneratePasswordOnUserCreatedHandler.handle(event)` then `eventBus.publish(event)`. The `@EventsHandler` runs again; idempotency makes the second pass a no-op after findById. Correctness is OK; layering and latency are not.

## Goals / Non-Goals

**Goals:**

- One code path executes generate/hash/update for missing-password creates.
- Command does not depend on the Nest `@EventsHandler` concrete class.
- Preserve await-before-201 and existing flag semantics.

**Non-Goals:**

- Outbox / distributed bus.
- Compensating transactions (other change).
- Returning plaintext password.

## Decisions

### D1 — Preferred shape: extract finalize use case; event is notification-only

1. Extract password finalize into an application service / use case (e.g. `FinalizePasswordOnUserCreated`) that both the command and (optionally) nothing else call.
2. Command: `await finalize.execute(userId)` when `passwordMissing`, then `eventBus.publish(UserCreatedEvent)`.
3. Remove `@EventsHandler` from the password generator **or** keep a thin listener that only audits/logs and MUST NOT generate passwords.

Alternative (acceptable if smaller diff): keep `@EventsHandler` as sole executor and introduce an awaiting EventPublisher; command MUST NOT inject the handler. OpenSpec apply picks the smaller correct option.

### D2 — Do not dual-invoke

Never both `await handler.handle` and publish to the same password `@EventsHandler`. If publish remains for the same class, drop explicit await (and ensure publish awaits) — or drop the decorator.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Accidental loss of await semantics while decoupling | Keep create-without-password unit + smoke green in tasks |
| Event story weakens if handler is removed | Document event as domain notification; finalize is application orchestration |

## Open Questions

1. Keep `@EventsHandler` as no-op/audit listener, or remove decorator entirely?
2. Prefer named port/use-case vs awaiting custom EventPublisher?
