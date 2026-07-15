## Why

Terraform lite is a hiring/delivery signal (ADR-0007) but CI never validates it. A cheap `fmt`/`validate` job strengthens the signal without requiring cloud apply or emulator.

## What Changes

- Add CI job (or step) for `terraform fmt -check` + `terraform validate` under `infra/` (init -backend=false).
- Document in README/ADR-0004 or ADR-0007.

## Source findings

- FINDING-012 — CI skips terraform validate (and related shallow ops)

## Non-goals

- Emulator in CI.
- Lint/ESLint gate (optional later).
- Deep health / Firestore probe.

## Capabilities

### New Capabilities

- _(none)_

### Modified Capabilities

- `delivery`: CI covers Terraform validate for `infra/`.

## Impact

- `.github/workflows/ci.yml`, possibly `infra/README.md`, ADR-0004/0007 note.
