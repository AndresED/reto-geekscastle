## 1. Platform bootstrap — Nx + Nest (US-01, US-04, US-21)

- [x] 1.1 Scaffold Nx workspace lite + Nest app `apps/api` (TypeScript strict)
- [x] 1.2 Root/npm wrappers: serve, build, test, test:cov for `api`
- [x] 1.3 Add ConfigModule + env validation (PORT, Firebase/emulator vars) and `.env.example`
- [x] 1.4 Global prefix `/api/v1`, ValidationPipe, `GET /api/v1/health`
- [x] 1.5 Shared HttpExceptionFilter + domain error types baseline

## 2. Users domain & ports (US-02, US-05, US-06, US-08)

- [x] 2.1 Create `modules/users` folder layout (domain/application/infrastructure)
- [x] 2.2 Implement `User` entity + domain errors
- [x] 2.3 Define `UserRepositoryPort`, `PasswordGeneratorPort`, `PasswordHasherPort` + DI tokens
- [x] 2.4 Define `UserCreatedEvent` in its own file

## 3. CQRS application handlers (US-03, US-09–US-13, US-15)

- [x] 3.1 `CreateUserCommand` + `CreateUserHandler` (separate files): create user, publish event
- [x] 3.2 `GeneratePasswordOnUserCreatedHandler` (own file): generate/hash/update when missing
- [x] 3.3 `GetUserByIdQuery` + `GetUserByIdHandler` (separate files)
- [x] 3.4 Wire `CqrsModule` + handlers in `UsersModule`

## 4. Infrastructure adapters & HTTP (US-07, US-09, US-14, US-15)

- [x] 4.1 Firebase Admin provider + `FirestoreUserRepository`
- [x] 4.2 Crypto password generator + bcrypt hasher adapters
- [x] 4.3 `CreateUserDto`, `UsersController` (command/query buses only)
- [x] 4.4 Map domain errors to HTTP status codes; ensure responses never leak secrets

## 5. Firebase emulator & docs (US-17, US-18, US-20)

- [x] 5.1 Add `firebase.json` / emulator config and npm script helpers
- [x] 5.2 Write root README (setup, emulator, run, curl, tests, links to docs)
- [x] 5.3 Verify docs index + ADRs still match implemented paths

## 6. Testing ≥ 80 % (US-16)

- [x] 6.1 Configure Jest `coverageThreshold` statements 80 + `collectCoverageFrom`
- [x] 6.2 Unit tests: `CreateUserHandler` (with/without password, event publish)
- [x] 6.3 Unit tests: password event handler (generate path + no-op path)
- [x] 6.4 Unit tests: controller delegation, generator/hasher, repository mapping (mocked Admin)
- [x] 6.5 Run `npm run test:cov` and fix until green

## 7. CI (US-19)

- [x] 7.1 Add `.github/workflows/ci.yml` (Node 20: `npm ci` → build `api` → `test:cov`)
- [x] 7.2 Document CI section in README (requires git remote)

## 8. Terraform lite (US-22)

- [x] 8.1 Add `infra/` Terraform (versions/providers/variables/main/outputs) for Firebase/Firestore scope
- [x] 8.2 Add `infra/README.md` (init/validate/plan; no secrets; emulator = demo path)
- [x] 8.3 Run `terraform fmt` + `terraform validate` locally before delivery

## 9. OpenSpec closeout

- [x] 9.1 Mark tasks complete as implemented; run `/opsx:archive` when ready to merge deltas into `openspec/specs/`
