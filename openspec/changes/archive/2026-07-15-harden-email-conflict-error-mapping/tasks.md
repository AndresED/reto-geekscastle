## 1. Robust mapping

- [x] 1.1 Add conflict detection beyond bare `instanceof` (message/code and/or post-failure claim read)
- [x] 1.2 Ensure mapped conflicts still throw `UserEmailConflictError` (HTTP 409 via existing filter)

## 2. Tests

- [x] 2.1 Unit: simulated wrapped/abort-style failure still yields `UserEmailConflictError`
- [x] 2.2 Unit: unrelated transaction failure still yields `UserPersistenceError`

## 3. Optional

- [x] 3.1 Optional emulator check that duplicate create returns 409 (only if time) — skipped; unit coverage of wrap/cause/claim probe instead
