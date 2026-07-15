# testing Specification

## Purpose
Jest unit and smoke testing strategy with global statements coverage threshold of at least 80 percent.
## Requirements
### Requirement: Jest unit test runner
The repository MUST provide npm scripts `test` and `test:cov` that run Jest for the NestJS application.

#### Scenario: Test script runs
- **WHEN** a developer executes `npm run test`
- **THEN** Jest executes the unit test suite and exits non-zero on failures

### Requirement: Coverage threshold eighty percent
Jest configuration MUST enforce a global statements coverage threshold of at least 80 percent (and SHOULD also constrain branches/functions/lines reasonably).

#### Scenario: Coverage below threshold fails
- **WHEN** `npm run test:cov` runs and statements coverage is below 80 percent
- **THEN** the command fails

### Requirement: Critical password and event tests
The suite MUST include unit tests for create-user handling, password generation/hashing adapters or ports, and the user-created event handler that updates the password when missing.

#### Scenario: Create without password publishes missing-password event
- **WHEN** unit tests exercise create without password with mocked ports
- **THEN** they assert the user-created event indicates password missing

#### Scenario: Event handler updates hash when password missing
- **WHEN** unit tests exercise the event handler with password-missing=true
- **THEN** they assert generate + hash + repository update interactions

#### Scenario: Event handler no-op when password present
- **WHEN** unit tests exercise the event handler with password-missing=false
- **THEN** they assert no password regeneration/update occurs

### Requirement: Handlers tested with mocked ports
Application handlers MUST be tested using mocks of ports; unit tests MUST NOT require a live Firestore emulator.

#### Scenario: Create handler test without Firebase
- **WHEN** `CreateUserHandler` unit tests run
- **THEN** they complete successfully with a mocked `UserRepositoryPort`

### Requirement: Create-user password smoke test
The repository MUST include an automated smoke or integration test that creates a user without a password using the real application handlers (not only isolated port mocks for the full flow) and asserts that a password hash is persisted and the user is reported as having a password after create completes.

#### Scenario: Create without password ends with hasPassword
- **WHEN** the smoke test creates a user without supplying a password
- **THEN** after the create operation completes successfully the user has a stored password hash (or `hasPassword: true` equivalent)

### Requirement: Smoke runnable via npm script
The smoke MUST be executable via a documented npm/nx script so developers and CI can run it without ad-hoc jest paths.

#### Scenario: Documented script exists
- **WHEN** a developer follows README or package scripts for the smoke
- **THEN** a single script command runs the create-user password smoke

### Requirement: Users API rate-limit HTTP test
The suite MUST include an automated HTTP (or equivalent Nest application) test that proves exceeding the configured rate limit on users routes (`POST` and/or `GET`) yields HTTP 429, and that `GET /api/v1/health` is not rejected solely by that API throttle.

#### Scenario: Excess users traffic returns 429
- **WHEN** the throttle test exceeds the configured users rate limit within the window
- **THEN** a subsequent users route request receives HTTP 429

#### Scenario: Health not API-throttled
- **WHEN** the throttle test has triggered users route rate limiting
- **THEN** `GET /api/v1/health` still succeeds (not 429 from the users API throttle alone)

