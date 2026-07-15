## Why

README still links to `openspec/changes/bootstrap-users-api/` after archive. ADR acceptance checklists and OpenSpec Purpose fields were left incomplete, which reads as documentation drift.

## What Changes

- Fix README OpenSpec links to `openspec/specs/` and/or archive path.
- Fill Purpose on living specs; tick ADR criteria that are met; enmienda notes for deferred ADR-0005 items if not yet implemented by sibling changes.

## Source findings

- FINDING-007 — README broken OpenSpec path
- FINDING-011 — ADR checkboxes / OpenSpec Purpose TBD

## Non-goals

- Implementing security/throttle (sibling change).
- Rewriting all ADRs.

## Capabilities

### New Capabilities

- _(none)_

### Modified Capabilities

- `delivery`: documentation pointers must resolve to living artifacts.

## Impact

- `README.md`, `docs/adr/*` checkboxes, `openspec/specs/*/spec.md` Purpose headers.
