## 1. Throttling

- [x] 1.1 Add `@nestjs/throttler` dependency
- [x] 1.2 Register ThrottlerModule + guard; limit POST /users (~20/min)
- [x] 1.3 Skip throttle on health endpoint
- [x] 1.4 Optional: unit/HTTP test that 21st POST in window returns 429

## 2. Helmet

- [x] 2.1 Add `helmet` dependency
- [x] 2.2 Enable Helmet in `main.ts`

## 3. Docs

- [x] 3.1 Update ADR-0005 checkboxes / notes to implemented
- [x] 3.2 Mention throttle limit briefly in README
