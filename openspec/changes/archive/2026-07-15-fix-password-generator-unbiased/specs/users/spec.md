## ADDED Requirements

### Requirement: Unbiased secure password generation
Password generation MUST use a cryptographically secure RNG and MUST NOT use naive modulo mapping of raw bytes onto the charset when that introduces measurable bias. Rejection sampling or an equivalent unbiased method MUST be used.

#### Scenario: Generator produces policy-compliant passwords
- **WHEN** the password generator runs
- **THEN** it returns a password of at least 16 characters using the configured charset without naive biased modulo mapping
