## Context

Conflict is thrown inside `runTransaction` when the email claim doc already exists. Outer catch:

```ts
if (error instanceof UserEmailConflictError) throw error;
throw new UserPersistenceError(...)
```

Mocked tests pass the domain error through unchanged. Real Admin SDK abort semantics may differ.

## Goals / Non-Goals

**Goals:**

- Duplicate email → `UserEmailConflictError` → HTTP 409 under wrapped transaction failures we can detect.
- No false 409 on unrelated persistence errors.

**Non-Goals:**

- Guaranteeing behavior for every Firebase internal wrapper forever without tests.
- Changing HTTP filter mapping rules.

## Decisions

### D1 — Dual signal (recommended)

1. Keep `instanceof UserEmailConflictError`.
2. Fallback: if error message includes the conflict sentinel (e.g. `Email already registered`) **or** a stable `code === 'CONFLICT'` on the domain error, rethrow/map to `UserEmailConflictError`.
3. Optional stronger path: on any transaction failure, `get(emailRef)` once; if claim exists for another (or any) user after failure that started as create, map to conflict. Prefer (2) first (cheaper, clearer).

### D2 — Unit test with synthetic wrap

```ts
runTransaction.mockRejectedValue(
  Object.assign(new Error('Email already registered: x'), { cause: conflict })
);
// or a plain Error with the domain message
```

Expect `UserEmailConflictError`, not `UserPersistenceError`.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Over-broad message match → false 409 | Match exact prefix from `UserEmailConflictError` message / code |
| Extra read after failure (if D1.3) | Only on non-instance failures |

## Open Questions

1. Message/code fallback only, or post-failure claim re-read?
