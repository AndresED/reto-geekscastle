## ADDED Requirements

### Requirement: Rate limit on user creation
The API MUST rate-limit `POST /api/v1/users` to reduce abuse. Excess requests MUST receive HTTP 429. The health endpoint MUST NOT be subject to the same write rate limit.

#### Scenario: Create is rate limited
- **WHEN** a client exceeds the configured create rate limit within the time window
- **THEN** the system responds with HTTP 429

#### Scenario: Health remains available under throttle policy
- **WHEN** a client calls `GET /api/v1/health`
- **THEN** the request is not rejected solely by the create-endpoint write throttle

### Requirement: HTTP security headers
The NestJS application MUST enable Helmet (or equivalent security headers middleware) at bootstrap.

#### Scenario: API boots with Helmet
- **WHEN** the API process starts successfully
- **THEN** Helmet middleware is registered on the HTTP application
