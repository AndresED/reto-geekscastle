## ADDED Requirements

### Requirement: List users response size is capped
The system MUST NOT return an unbounded dump of all users on `GET /api/v1/users`. The list path MUST apply a documented maximum page size (hard server cap). When more users exist than the cap, the response MUST contain at most that many public user objects (HTTP 200). The cap MUST be enforced in persistence (or equivalently before response mapping) so the application does not load an arbitrarily large collection into memory as the primary strategy.

#### Scenario: List respects maximum page size
- **WHEN** more users exist than the configured list maximum
- **THEN** `GET /api/v1/users` responds with HTTP 200 and at most that maximum number of public user objects

#### Scenario: List under the cap returns all
- **WHEN** fewer users exist than the configured list maximum
- **THEN** `GET /api/v1/users` responds with HTTP 200 and every public user (same secret-free projection as before)
