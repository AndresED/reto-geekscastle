## ADDED Requirements

### Requirement: Documentation links resolve
Project README documentation links to OpenSpec MUST point to living `openspec/specs/` and/or an existing archive path under `openspec/changes/archive/`, not a deleted active change directory.

#### Scenario: README OpenSpec link exists
- **WHEN** an evaluator follows the README OpenSpec documentation link
- **THEN** the target path exists in the repository
