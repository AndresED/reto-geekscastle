## Why

Unit tests mock ports in isolation and would not catch EventBus race or create→password persistence bugs. The challenge-critical path needs at least one smoke/regression that asserts password hash lands and GET/`hasPassword` is true after create-without-password.

## What Changes

- Add a Nest TestingModule (or emulator) smoke that creates a user without password and asserts finalized password state.
- Document how to run it; CI may stay unit-only if emulator is too heavy, but the smoke MUST exist and run in a documented npm script.

## Source findings

- FINDING-005 — No integration/smoke for create→password→GET

## Non-goals

- Full Firebase emulator job in CI (optional later).
- E2E Playwright / browser tests.

## Capabilities

### New Capabilities

- _(none)_

### Modified Capabilities

- `testing`: require smoke covering create-without-password password finalization.

## Impact

- New test file under `apps/api` (unit-with-real-handlers or e2e-style).
- May depend on `fix-await-password-on-user-created` being applied first for green CI.
