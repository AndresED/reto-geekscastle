## ADDED Requirements

### Requirement: Create rate-limit HTTP test
The suite MUST include an automated HTTP (or equivalent Nest application) test that proves exceeding the configured create rate limit for `POST /api/v1/users` yields HTTP 429, and that `GET /api/v1/health` is not rejected solely by that write throttle.

#### Scenario: Excess create returns 429
- **WHEN** the throttle test exceeds the configured create rate limit within the window
- **THEN** a subsequent create request receives HTTP 429

#### Scenario: Health not write-throttled
- **WHEN** the throttle test has triggered create rate limiting
- **THEN** `GET /api/v1/health` still succeeds (not 429 from the create write throttle alone)
