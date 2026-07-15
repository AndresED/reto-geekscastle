# ADR-0005: Seguridad — passwords, validación y límites

## Estado

Aceptado

## Enmienda (2026-07-15 — baseline aplicada)

- `@nestjs/throttler`: **20 req/min por IP** en rutas de users (`POST` + `GET`); solo `/health` con `@SkipThrottle()`.
- `helmet()` en `main.ts`.
- Generador de password usa rejection sampling (sin bias de modulo).

## Enmienda (2026-07-15 — finalize path, no event handler)

La generación/hash/update cuando falta password corre en **`FinalizeMissingPasswordService`** (await desde `CreateUserHandler`). `UserCreatedAuditHandler` solo audit/log — no muta password. Ver ADR-0002.

## Fecha

2026-07-15

## Alcance

Política de passwords, secretos, validación de entrada y límites conscientes del MVP del reto.

## Contexto

El reto pide password seguro y menciona bcrypt. En la práctica:

- **Generar** password ≠ **hashear** password.
- bcrypt (o argon2) hashea; la generación usa CSPRNG.

La API del reto es demo sin auth de clientes; aun así se aplican controles razonables.

## Elección final

| Control | Decisión |
|---------|----------|
| Generación | `crypto.randomBytes` (Node) → charset alfanumérico + símbolos seguros; **longitud ≥ 16** |
| Hash | **bcrypt** cost factor **10** (dev) / documentar 12 como evolución prod |
| Persistencia | Solo `passwordHash`; nunca plaintext |
| API response | Sin password ni hash; flags `passwordGenerated` / `hasPassword` ok |
| Logs | Sin password, hash, ni PII innecesaria |
| Validación | `ValidationPipe` `whitelist` + `forbidNonWhitelisted` + `transform` |
| Email | Formato válido; normalización trim/lowercase en frontera |
| Password cliente (si envía) | Longitud mínima **8**; máximo razonable (ej. 128) para evitar DoS de bcrypt |
| Rate limit | `@nestjs/throttler` **20/min por IP** en rutas `/users` (health exento) |
| AuthN/AuthZ API | **No** en v1 |
| Helmet | **Implementado** en `main.ts` |
| Secretos | Solo env / secret manager; nunca repo |

## Decisión

### Política password generado

- Longitud: **16**.
- Charset: `A–Z`, `a–z`, `0–9`, y un set reducido de símbolos (`!@#$%^&*`).
- Una sola generación por usuario en **`FinalizeMissingPasswordService`**; idempotente si ya hay hash.

### Password proveído por cliente

- Se valida longitud; se hashea; `passwordGenerated=false`.
- El finalize path **no** regenera si ya hay hash.

### Superficie de ataque aceptada en demo

| Límite | Riesgo | Mitigación futura |
|--------|--------|-------------------|
| Sin auth en API | Cualquiera crea users | API key / JWT |
| Emulator abierto en host | Acceso local | No exponer en redes no confiables |
| Throttle in-memory | Bypass multi-IP | Redis store / gateway |

## Alternativas consideradas

### A. Guardar plaintext “porque es demo”

**Inaceptable** incluso en reto.

### B. Solo bcrypt sin generación CSPRNG (Math.random)

**Inaceptable.**

### C. Generación CSPRNG + bcrypt + validación frontera (elegida)

Cumple reto + higiene básica.

## Consecuencias

- Tests deben cubrir: generate length/charset (spot), hash called, plaintext nunca pasado al repository.create/update como campo final de DB.
- Evaluador ve criterio de producción en ADR aunque el scope sea pequeño.

## Criterios de aceptación

- [x] Generador y hasher detrás de ports (ADR-0002).
- [x] Firestore sin plaintext.
- [x] `.env*` con secretos reales no versionados.
- [x] Filter HTTP sin stack traces en respuesta.
- [x] Throttle en rutas `/users` (POST + GET) + Helmet en bootstrap; `/health` exento.
