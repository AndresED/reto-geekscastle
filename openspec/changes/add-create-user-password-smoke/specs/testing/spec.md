## ADDED Requirements

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
