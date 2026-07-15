---
name: /code-review
id: code-review
category: Workflow
description: Exhaustive Principal Engineer code review — generates a structured report (no implementation)
---

Perform an exhaustive code review and write a **structured report**. Do **not** implement fixes.

**Goal:** Produce input for `/review-to-openspec`, which turns findings into OpenSpec changes.

---

## Input

Argument after `/code-review` (optional):

| Input | Scope |
|-------|--------|
| *(empty)* | Changes since `main` (or `master`): `git diff main...HEAD` + untracked relevant files |
| `branch` | Same as empty |
| `full` | Whole repo `apps/api`, `apps/web`, `docs`, `openspec` |
| `apps/api` / path | Only that path |
| `staged` | `git diff --cached` |

If the base branch is unclear, try `main` then `master`.

---

## Rules to apply (read and follow)

Load constraints from `.cursor/rules/`:

| Rule | Focus |
|------|--------|
| `reviewer.mdc` | Severity, finding format, Principal Engineer tone |
| `principal-engineer.mdc` | Merge bar, maintainability, failure modes |
| `architecture.mdc` | Hexagonal, SOLID, layer boundaries |
| `nestjs-review.mdc` | `apps/api` |
| `react-review.mdc` | `apps/web` |
| `security-review.mdc` | Auth, validation, secrets, CORS |
| `testing-review.mdc` | Coverage, test quality |
| `documentation-review.mdc` | README, specs, ADRs |

Also respect project ADRs in `docs/adr/` and canonical specs in `openspec/specs/`.

---

## Review process

1. **Determine scope** (git diff or path).
2. **Map affected areas:** backend, frontend, infra, docs, tests.
3. **Read changed files and callers** — use CodeGraph if `.codegraph/` exists.
4. **Challenge architecture** — do not assume the implementation is correct.
5. **Classify every finding:**

   `Critical` | `High` | `Medium` | `Low` | `Suggestion`

6. **Each finding MUST include:**
   - **ID** — `FINDING-001`, `FINDING-002`, …
   - **Problem** — what is wrong or risky
   - **Why it matters** — context for the team
   - **Impact** — user, security, maintainability, performance
   - **Recommendation** — concrete fix direction (no code unless tiny illustrative snippet)
   - **Location** — file path + line range when possible
   - **OpenSpec candidate** — `yes` / `no` / `maybe` (can this become its own change?)

7. **Record strengths** — what is well done (mandatory if few issues).

8. **Do NOT** edit production code, commit, or open PRs.

---

## Output — report file

Write the report to:

```
docs/reviews/YYYY-MM-DD-code-review.md
```

Also update the pointer file:

```
docs/reviews/latest.md
```

`latest.md` is a one-line redirect:

```markdown
# Latest code review

See [YYYY-MM-DD-code-review.md](./YYYY-MM-DD-code-review.md).
```

Use today's date for `YYYY-MM-DD`.

### Report template

```markdown
# Code Review Report

| Field | Value |
|-------|--------|
| Date | YYYY-MM-DD |
| Scope | e.g. branch diff vs main, apps/api |
| Base commit | `git rev-parse --short main` or HEAD |
| Reviewer | Principal Engineer (Cursor agent) |

## Executive summary

2–4 sentences: overall quality, merge recommendation (Approve / Approve with fixes / Request changes), top risks.

## Findings index

| ID | Severity | Area | Title | OpenSpec? |
|----|----------|------|-------|-----------|
| FINDING-001 | High | backend | … | yes |

## Findings

### FINDING-001 — [Title]

- **Severity:** …
- **Area:** backend | frontend | infra | docs | tests | security
- **Location:** `path/to/file.ts:42-58`
- **Problem:** …
- **Why it matters:** …
- **Impact:** …
- **Recommendation:** …
- **OpenSpec candidate:** yes — suggested change slug: `fix-xyz`

(repeat per finding)

## Strengths

- …

## Suggested OpenSpec groupings (preview)

Preview only — `/review-to-openspec` creates the real changes.

| Change slug (proposed) | Findings | Rationale |
|------------------------|----------|-----------|
| `improve-error-mapping` | FINDING-003, FINDING-007 | Same bounded context |

## Out of scope / not reviewed

- …
```

---

## Final message to user

After writing the report:

1. Path to the report file
2. Count by severity (Critical / High / …)
3. Merge recommendation
4. Next step: **`/review-to-openspec`** to convert findings into OpenSpec changes (or `/review-to-openspec path/to/report.md`)
