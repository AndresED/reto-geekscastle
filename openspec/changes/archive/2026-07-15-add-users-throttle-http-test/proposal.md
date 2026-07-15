## Why

Rate limiting on `POST /users` is implemented and required by living specs, but no automated test proves 429 wiring. The harden-api task marked the optional 429 test done without a suite — regressions in ThrottlerModule/APP_GUARD would slip through.

## What Changes

- Add one Nest HTTP (or lightweight e2e) test: exceed create limit → 429; health/GET remain unconstrained.
- Prefer mocking `ThrottlerStorage` or a short TTL/limit in test module to keep the suite fast.
- Keep the test behind existing Jest scripts (no new framework).

## Source findings

- FINDING-004 — Throttle behavior untested

## Non-goals

- Changing production limit numbers.
- Load/K6 testing.
- Lint job / deep health (FINDING-006).

## Capabilities

### New Capabilities

- _(none)_

### Modified Capabilities

- `testing`: Automated coverage that create rate limit returns HTTP 429 when exceeded.
- `delivery`: Behavior unchanged; verify existing rate-limit requirement remains enforceable via tests.

## Impact

- New `*throttle*.spec.ts` (or extend users e2e).
- Possibly test AppModule override for throttler config.
