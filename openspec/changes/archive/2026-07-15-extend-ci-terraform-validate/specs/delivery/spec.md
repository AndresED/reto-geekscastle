## ADDED Requirements

### Requirement: CI validates Terraform lite
Continuous Integration MUST run `terraform fmt -check` and `terraform validate` for the `infra/` configuration (with backend disabled for init) on push/PR to the default branch.

#### Scenario: Invalid Terraform fails CI
- **WHEN** the Terraform configuration under `infra/` fails fmt check or validate
- **THEN** the CI workflow fails
