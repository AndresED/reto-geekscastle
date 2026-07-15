## 1. Platform bootstrap — Nx + Nest (US-01, US-04, US-21)

- [ ] 1.1 Scaffold Nx workspace lite + Nest app `apps/api` (TypeScript strict)
- [ ] 1.2 Root/npm wrappers: serve, build, test, test:cov for `api`
- [ ] 1.3 Add ConfigModule + env validation (PORT, Firebase/emulator vars) and `.env.example`
- [ ] 1.4 Global prefix `/api/v1`, ValidationPipe, `GET /api/v1/health`
- [ ] 1.5 Shared HttpExceptionFilter + domain error types baseline

## 2. Users domain & ports (US-02, US-05, US-06, US-08)

- [ ] 2.1 Create `modules/users` folder layout (domain/application/infrastructure)
- [ ] 2.2 Implement `User` entity + domain errors
- [ ] 2.3 Define `UserRepositoryPort`, `PasswordGeneratorPort`, `PasswordHasherPort` + DI tokens
- [ ] 2.4 Define `UserCreatedEvent` in its own file

## 3. CQRS application handlers (US-03, US-09–US-13, US-15)

- [ ] 3.1 `CreateUserCommand` + `CreateUserHandler` (separate files): create user, publish event
- [ ] 3.2 `GeneratePasswordOnUserCreatedHandler` (own file): generate/hash/update when missing
- [ ] 3.3 `GetUserByIdQuery` + `GetUserByIdHandler` (separate files)
- [ ] 3.4 Wire `CqrsModule` + handlers in `UsersModule`

## 4. Infrastructure adapters & HTTP (US-07, US-09, US-14, US-15)

- [ ] 4.1 Firebase Admin provider + `FirestoreUserRepository`
- [ ] 4.2 Crypto password generator + bcrypt hasher adapters
- [ ] 4.3 `CreateUserDto`, `UsersController` (command/query buses only)
- [ ] 4.4 Map domain errors to HTTP status codes; ensure responses never leak secrets

## 5. Firebase emulator & docs (US-17, US-18, US-20)

- [ ] 5.1 Add `firebase.json` / emulator config and npm script helpers
- [ ] 5.2 Write root README (setup, emulator, run, curl, tests, links to docs)
- [ ] 5.3 Verify docs index + ADRs still match implemented paths

## 6. Testing ≥ 80 % (US-16)

- [ ] 6.1 Configure Jest `coverageThreshold` statements 80 + `collectCoverageFrom`
- [ ] 6.2 Unit tests: `CreateUserHandler` (with/without password, event publish)
- [ ] 6.3 Unit tests: password event handler (generate path + no-op path)
- [ ] 6.4 Unit tests: controller delegation, generator/hasher, repository mapping (mocked Admin)
- [ ] 6.5 Run `npm run test:cov` and fix until green

## 7. CI (US-19)

- [ ] 7.1 Add `.github/workflows/ci.yml` (Node 20: `npm ci` → build `api` → `test:cov`)
- [ ] 7.2 Document CI section in README (requires git remote)

## 8. Terraform lite (US-22)

- [ ] 8.1 Add `infra/` Terraform (versions/providers/variables/main/outputs) for Firebase/Firestore scope
- [ ] 8.2 Add `infra/README.md` (init/validate/plan; no secrets; emulator = demo path)
- [ ] 8.3 Run `terraform fmt` + `terraform validate` locally before delivery

## 9. OpenSpec closeout

- [ ] 9.1 Mark tasks complete as implemented; run `/opsx:archive` when ready to merge deltas into `openspec/specs/`
