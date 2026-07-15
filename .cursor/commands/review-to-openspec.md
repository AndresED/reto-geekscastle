---
name: /review-to-openspec
id: review-to-openspec
category: Workflow
description: Turn a code review report into one or more OpenSpec changes (proposal only, no implementation)
---

Convert a **code review report** into **OpenSpec changes** for refinement and later implementation.

**Do NOT implement code.** Only create planning artifacts under `openspec/changes/`.

---

## Input

| Argument | Behavior |
|----------|----------|
| *(empty)* | Read `docs/reviews/latest.md` → linked report |
| `docs/reviews/2026-07-03-code-review.md` | Use that report |
| `FINDING-001,FINDING-003` | Only those findings from latest report |

If no report exists, tell the user to run **`/code-review`** first.

---

## Prerequisites

- Report follows format from `/code-review` (Findings index + FINDING-xxx sections)
- OpenSpec CLI available: `npx openspec validate --specs`
- No implementation in this step

---

## Process

### 1. Read and parse report

- Load the report file
- Collect findings where **OpenSpec candidate** is `yes` or `maybe`
- Ignore `no` unless user passed explicit finding IDs

### 2. Group findings into changes

Rules for grouping:

| Rule | Example |
|------|---------|
| One bounded context per change | backend error handling ≠ frontend toast styling |
| One concern per change | security hardening ≠ test coverage |
| Small, reviewable PRs | 3–8 tasks per change max |
| Do not mix unrelated improvements | avoid `misc-fixes` |

Each group gets a **kebab-case slug**: `improve-api-error-envelope`, `add-rate-limiting`, etc.

If a **Critical** finding exists, it gets its own change or leads the first change.

Present the grouping plan to the user **before** creating files (short table: slug → findings → one-line why).

### 3. Create OpenSpec changes

For **each** group:

```bash
openspec new change "<slug>"
```

Then create artifacts (spec-driven schema):

| File | Content source |
|------|----------------|
| `proposal.md` | Why (from findings), scope in/out, success criteria |
| `design.md` | How to fix, affected files, approach, risks |
| `tasks.md` | Checkbox tasks mapped 1:1 from recommendations |
| `specs/backend/spec.md` or `specs/frontend/spec.md` | **Delta only** if behavior/spec changes; use `## ADDED/MODIFIED Requirements` |

Link findings in proposal:

```markdown
## Source findings

- FINDING-003 — …
- FINDING-007 — …
```

**Do not** copy the full review into OpenSpec — summarize and refine.

### 4. Validate

```bash
openspec validate <slug>
openspec validate --specs   # ensure canonical specs still valid if you didn't modify them
```

### 5. Output summary

For each change:

- Path: `openspec/changes/<slug>/`
- Findings addressed
- Task count
- Validation status

Tell the user:

1. Review proposals manually (refinement gate)
2. **`/opsx:apply <slug>`** when ready to implement
3. **`/opsx:archive <slug>`** after merge

---

## Guardrails

- **Never** implement code in this command
- **Never** merge unrelated findings into one change
- **Never** skip `proposal.md` / `design.md` / `tasks.md`
- Prefer **new changes** over editing archived ones
- If finding is unclear, add an open question in `design.md` instead of guessing
- If finding is purely stylistic with no spec impact, tasks-only change is OK (no spec delta)

---

## Workflow position

```
/code-review  →  docs/reviews/*.md
       ↓
/review-to-openspec  →  openspec/changes/<slug>/
       ↓
(opsx:apply)  →  implementation
       ↓
(opsx:archive)  →  openspec/specs/ + archive/
```
