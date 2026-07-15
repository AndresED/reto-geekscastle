## 1. Concurrency-safe claim

- [x] 1.1 Choose strategy (email registry `create()` / transaction vs docs-only deferral)
- [x] 1.2 Implement claim + user create; map already-exists to `UserEmailConflictError` → 409
- [x] 1.3 On compensate delete after finalize failure, release email claim best-effort

## 2. Tests

- [x] 2.1 Unit/adapter: second claim for same email fails without a second user row
- [x] 2.2 Keep existing sequential duplicate → 409 behavior green

## 3. Docs

- [x] 3.1 README: remove or narrow TOCTOU note once hardened (or keep explicit if docs-only)
