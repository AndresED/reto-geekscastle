## 1. Write-path consistency

- [ ] 1.1 Choose await strategy (await event handler vs awaiting EventPublisher) and implement in `CreateUserHandler`
- [ ] 1.2 Ensure create response user reflects persisted hash/flags when password was missing
- [ ] 1.3 Propagate generate/update failures so POST does not return 201 on failure

## 2. Idempotency

- [ ] 2.1 In `GeneratePasswordOnUserCreatedHandler`, skip work when user already has passwordHash
- [ ] 2.2 Unit test: replay / already-hashed user does not call generate

## 3. Regression tests

- [ ] 3.1 Unit: create without password → result `hasPassword: true` / `passwordGenerated: true` (with in-process await)
- [ ] 3.2 Unit: `updatePassword` rejects → create fails (no silent success)

## 4. Docs

- [ ] 4.1 Note failure/orphan policy in ADR-0002 enmienda or design note if compensate deferred
