## 1. Compensate path

- [x] 1.1 Add `delete` (or equivalent) to `UserRepositoryPort` + Firestore adapter if missing
- [x] 1.2 On missing-password finalize failure after create, best-effort delete then rethrow
- [x] 1.3 Ensure create still does not return 201 on that path

## 2. Tests

- [x] 2.1 Unit: `updatePassword`/finalize rejects → repository delete invoked (or status marked)
- [x] 2.2 Optional smoke asserting no orphan after forced update failure

## 3. Docs

- [x] 3.1 README/ADR one-liner: compensate policy + residual crash window
