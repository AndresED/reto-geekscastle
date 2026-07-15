## 1. Port + adapters

- [x] 1.1 Introduce list max constant (e.g. `USERS_LIST_MAX = 100` under `shared/config` or users module)
- [x] 1.2 Change repository port to accept a limit (or document that `listAll` is always capped) and implement Firestore `.limit(N)` (prefer `orderBy createdAt` if index is trivial)
- [x] 1.3 Update in-memory test double to honor the same limit

## 2. Application + HTTP docs

- [x] 2.1 Wire `ListUsersHandler` to pass the constant limit
- [x] 2.2 Document the cap in Swagger operation text and a short README note (MVP, no full pagination)

## 3. Tests

- [x] 3.1 Unit: more than max users → response/list length ≤ max
- [x] 3.2 Unit: Firestore adapter invokes limit (mock) and/or in-memory cap behavior
