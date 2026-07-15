## ADDED Requirements

### Requirement: Product infra docs match Users/Firestore
Documentation under `docs/infra/` MUST describe this repository’s Users API and Firestore model (and may link to repo-root Terraform under `infra/`). It MUST NOT present a different application (e.g. Pokémon + PostgreSQL) as the product architecture of this challenge.

#### Scenario: Evaluator reads docs/infra
- **WHEN** an evaluator opens `docs/infra/README.md` or its linked data-model / C4 pages
- **THEN** they see Nest Users + Firestore (and optional Terraform pointers), not an unrelated Postgres/Pokémon stack presented as this product
