## 1. Atomic create

- [x] 1.1 Implement transaction (or equivalent) that writes email claim + user doc together with conflict detection
- [x] 1.2 Keep ALREADY_EXISTS / existing claim → `UserEmailConflictError`
- [x] 1.3 Ensure user-set failure path cannot leave a durable claim (transaction abort or explicit release)

## 2. Tests

- [x] 2.1 Unit/adapter coverage for conflict and happy path under the new write strategy
- [x] 2.2 Confirm compensate delete still clears claim + user

## 3. Docs

- [x] 3.1 README: note atomic create; only document manual recovery if a residual window remains
