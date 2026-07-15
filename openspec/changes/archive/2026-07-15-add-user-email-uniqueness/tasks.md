## 1. Uniqueness rule

- [x] 1.1 Add repository lookup by email (normalized) + domain conflict error
- [x] 1.2 Enforce uniqueness in create command/handler before persist
- [x] 1.3 Map conflict to HTTP 409 at presentation layer

## 2. Tests

- [x] 2.1 Unit: duplicate email → conflict error / no second create
- [x] 2.2 HTTP or controller mapping test for 409 if cheap

## 3. Docs

- [x] 3.1 README: duplicates no longer allowed; note race/normalization
