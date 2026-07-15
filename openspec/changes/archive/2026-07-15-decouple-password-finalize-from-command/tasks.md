## 1. Single executor

- [x] 1.1 Extract password finalize into an application use case/port (or awaiting publisher) owned by the write path
- [x] 1.2 Update `CreateUserHandler` to await that path only; stop injecting `GeneratePasswordOnUserCreatedHandler`
- [x] 1.3 Ensure `EventBus.publish` does not re-run password generation (drop `@EventsHandler` or make listener non-mutating)

## 2. Consistency preserved

- [x] 2.1 Missing-password create still awaits finalize before returning; response flags unchanged
- [x] 2.2 Idempotency retained if finalize/event can be replayed

## 3. Tests & docs

- [x] 3.1 Adjust unit tests for new injection graph (no concrete event-handler on command)
- [x] 3.2 Keep smoke `test:smoke` green
- [x] 3.3 Note chosen await strategy in ADR-0002 (short enmienda)
