## Context

FINDING-001/002 need a locking test. Prefer in-process TestingModule with real CQRS handlers + in-memory/fake repository over full emulator when possible (faster, CI-friendly).

## Goals / Non-Goals

**Goals:** One automated smoke that fails if create returns before password persisted.

**Non-Goals:** Emulator-required CI; covering throttle/Helmet.

## Decisions

### D1 — In-memory fake repository

Use a simple `Map`-backed `UserRepositoryPort` fake + real generate/hasher (or light hasher stub) + real handlers wired with CqrsModule so EventBus/await behavior matches production after the await fix.

### D2 — Ordering

Apply after (or with) `fix-await-password-on-user-created`; otherwise smoke encodes the current race as “expected.”

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Smoke flakes on real bcrypt timing | Single-threaded await; no parallel |
| Duplicates await-fix unit tests | Smoke focuses on HTTP or full handler graph |

## Open Questions

- Prefer `supertest` against Nest app vs handler-level integration only?
