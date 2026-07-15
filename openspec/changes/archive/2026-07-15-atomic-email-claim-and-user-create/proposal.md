## Why

Email uniqueness uses `emails/{email}.create` then `users/{id}.set`. A crash between those writes can leave a claim with no user document, permanently 409-ing that email until manual cleanup. Concurrent twins are already blocked; partial-create availability is not.

## What Changes

- Make claim + user document persistence atomic (Firestore transaction or equivalent batched conflict-detecting write).
- Keep ALREADY_EXISTS / conflict → HTTP 409 mapping.
- Preserve compensate-on-finalize-failure releasing both user and claim.
- Document residual limits only if absolute atomicity cannot be guaranteed.

## Source findings

- FINDING-002 — Non-atomic email claim then user write

## Non-goals

- Username uniqueness.
- Changing email normalization.
- Distributed multi-region guarantees beyond Firestore transaction semantics.

## Capabilities

### New Capabilities

- _(none)_

### Modified Capabilities

- `users`: Successful create MUST NOT leave a durable email claim without a corresponding user document from a partial write of the create path.

## Impact

- `FirestoreUserRepository.create` (+ tests).
- Possibly README recovery note if any residual remains.
