## ADDED Requirements

### Requirement: Firebase emulator local workflow
The project MUST document and support running the Firestore emulator locally and connecting the NestJS app to it via environment variables.

#### Scenario: Developer can run against emulator
- **WHEN** a developer follows README emulator instructions with valid `.env`
- **THEN** they can start the emulator and the API against `FIRESTORE_EMULATOR_HOST` without production credentials in the repository

### Requirement: README documentation
The repository MUST include a README describing prerequisites, environment setup, how to start emulator and API, how to run tests, and example curl for create user with and without password.

#### Scenario: README covers required topics
- **WHEN** an evaluator reads the README
- **THEN** it includes setup, run, test, and curl examples linked to ADRs/requirements

### Requirement: Continuous integration build and tests
The repository MUST include a GitHub Actions workflow that installs dependencies, compiles the project, and runs `test:cov` on push and pull requests to the default branch.

#### Scenario: CI fails on compile error
- **WHEN** the codebase does not compile
- **THEN** the CI workflow fails

#### Scenario: CI fails on test or coverage failure
- **WHEN** tests fail or coverage is below the configured threshold
- **THEN** the CI workflow fails

### Requirement: No secrets in repository
The repository MUST NOT contain real Firebase service account keys or production secrets; only `.env.example` placeholders are allowed.

#### Scenario: No committed service account
- **WHEN** the repository tree is inspected for credentials
- **THEN** no real service account JSON or live secrets are present

### Requirement: Nx workspace lite
The repository MUST be an Nx workspace with a single NestJS application project named `api` located under `apps/api`, and MUST document serve/build/test commands for that project.

#### Scenario: Api project exists
- **WHEN** an evaluator inspects the workspace
- **THEN** `apps/api` exists as the NestJS application orchestrated by Nx

### Requirement: Terraform lite for Firebase
The repository MUST include a `infra/` Terraform configuration that is formattable/validatable and documents cloud provisioning for Firebase/Firestore without requiring `terraform apply` for the local challenge demo.

#### Scenario: Infra folder is present and documented
- **WHEN** an evaluator reads `infra/` documentation
- **THEN** they can run or understand `terraform validate` and still use the emulator as the challenge runtime path
