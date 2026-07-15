## 1. Docs alignment

- [x] 1.1 Update README create-without-password wording to sole mutator = finalize service; event = signal (cite ADR-0002)
- [x] 1.2 Update `docs/requirements/reto.md` US-11/US-12 acceptance notes/checkboxes to match implementation
- [x] 1.3 Polish ADR-0002 if any leftover “event generates password” phrasing remains outside the enmienda

## 2. Optional optical handler

- [x] 2.1 Decide docs-only vs thin non-mutating `@EventsHandler` (prefer docs-only unless checklist requires a handler file)
- [x] 2.2 If thin handler: implement log-only listener; assert it does not call updatePassword/generate

## 3. Spec consistency

- [x] 3.1 Ensure living `users` event wording matches finalize-as-mutator (delta already planned; verify after apply)
