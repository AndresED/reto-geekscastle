## 1. Throttling

- [ ] 1.1 Add `@nestjs/throttler` dependency
- [ ] 1.2 Register ThrottlerModule + guard; limit POST /users (~20/min)
- [ ] 1.3 Skip throttle on health endpoint
- [ ] 1.4 Optional: unit/HTTP test that 21st POST in window returns 429

## 2. Helmet

- [ ] 2.1 Add `helmet` dependency
- [ ] 2.2 Enable Helmet in `main.ts`

## 3. Docs

- [ ] 3.1 Update ADR-0005 checkboxes / notes to implemented
- [ ] 3.2 Mention throttle limit briefly in README
