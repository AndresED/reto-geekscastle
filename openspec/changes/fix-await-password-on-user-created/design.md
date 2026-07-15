## Context

Nest CQRS `EventBus.publish` uses RxJS pub/sub and does not wait for `@EventsHandler` completion. Current create path publishes `UserCreatedEvent` and returns the pre-update `User`.

## Goals / Non-Goals

**Goals:**

- Create-without-password 201 reflects persisted password (`hasPassword: true`, `passwordGenerated: true`).
- Fail create with 5xx (mapped domain/persistence error) if generation/update fails after insert — or compensate; prefer fail-loud after await.
- Replay-safe: if hash already exists, skip regenerate.

**Non-Goals:**

- Distributed outbox / multi-instance event bus.
- Returning generated plaintext password.

## Decisions

### D1 — Await password side-effect in write path

Preferred approaches (pick one in apply):

1. **Command awaits handler:** After `publish`, explicitly `await generatePasswordHandler.handle(event)` (and keep publish for discovery/audit), **or** publish-only with a custom EventBus that `Promise.all`s handlers.
2. **Inline then publish:** Generate/update inside create when missing, then publish `passwordMissing: false` after success (weaker “event generates password” story — avoid unless deadlines force it).

**Recommendation:** Keep domain event + event handler as source of password generation logic; **await** that handler from the command (inject handler or use ModuleRef) so one code path owns generate/hash/update. Document that Nest default EventBus alone is insufficient for request-scoped consistency.

### D2 — Failure semantics

If update fails after create: rethrow so create returns 502/500. Accept possible orphan row (document) **or** delete user on failure (compensating). Open question: compensate vs leave orphan + 5xx.

### D3 — Idempotency

In event handler: `findById`; if `hasPassword`, return; else generate/update.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Double execution if both EventBus auto-handler and explicit await run | Disable auto-handling for this event **or** only await via EventBus Promise.all — never both |
| Longer request latency (bcrypt) | Already paid when client sends password; acceptable for challenge |

## Open Questions

1. Compensate (delete user) on generate failure, or leave orphan + error?
2. Prefer custom awaiting EventPublisher vs explicit handler invoke?
