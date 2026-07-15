## Context

Referential Pokémon docs were moved/partially deleted; `docs/infra/` retained Pokémon narratives. Root `infra/` is Terraform for Firebase. Confusion is naming + leftover content.

## Goals / Non-Goals

**Goals:**

- One correct story in `docs/infra/` for evaluators.
- Explicit separation from any reference/example materials.

**Non-Goals:**

- Full C4 enterprise kit.
- Changing Terraform modules.

## Decisions

### D1 — Rewrite in place (recommended)

1. `docs/infra/README.md` — Users API + Firestore emulator + pointer to `../../infra/README.md` (Terraform).
2. `docs/infra/base-de-datos.md` — collections `users` + `emails` fields/roles (claim for uniqueness).
3. `docs/infra/c4-y-flujos.md` — context/containers + POST create sequence (finalize + event audit).

### D2 — Quarantine alternative

Move Pokémon files to `docs/documentacion-referencial-ejemplo/` with a banner “NOT this challenge,” then rewrite thin Users stubs in `docs/infra/`. Prefer D1 if referential material is unused.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Broken links from docs/README | Grep/update links in same change |
| Over-documenting Terraform | Keep Terraform details in `infra/README.md` only |

## Open Questions

1. Keep any Pokémon pages at all (quarantine) or delete?
