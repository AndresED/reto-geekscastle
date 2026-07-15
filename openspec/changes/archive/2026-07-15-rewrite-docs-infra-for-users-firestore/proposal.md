## Why

`docs/infra/` still describes the Pokémon/React/PostgreSQL reference stack after a relocation. The living product is Nest Users + Firestore (+ Terraform at repo-root `infra/`). Evaluators who open `docs/infra/` get the wrong architecture in minutes.

## What Changes

- Replace or quarantine Pokémon content under `docs/infra/`.
- Document Users Firestore collections (`users`, `emails` claim), create flow at C4/sequence level, and pointer to repo-root `infra/` Terraform.
- Ensure `docs/README.md` (if linking) points at the correct stories.

## Source findings

- FINDING-001 — `docs/infra/` still documents Pokémon + PostgreSQL

## Non-goals

- Rewriting all ADRs (already Users-aligned).
- Changing API/runtime behavior.
- Restoring a full Pokémon tutorial as product docs.

## Capabilities

### New Capabilities

- _(none)_

### Modified Capabilities

- `delivery`: Product documentation under `docs/infra/` MUST describe this Users/Firestore system (not a foreign reference app).

## Impact

- `docs/infra/*`, possibly `docs/README.md`.
- No application code.
