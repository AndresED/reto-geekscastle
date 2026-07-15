# Reto GeeksCastle — Users API

[![CI](https://github.com/AndresED/reto-geekscastle/actions/workflows/ci.yml/badge.svg)](https://github.com/AndresED/reto-geekscastle/actions/workflows/ci.yml)

API **NestJS** (hexagonal + **CQRS**) + **Firebase Firestore**, orquestada con **Nx lite**, IaC **Terraform lite**.  
Al crear un usuario sin `password`, `FinalizeMissingPasswordService` genera uno seguro, lo hashea (bcrypt) y actualiza el documento **en el request path** (await). Luego se publica `UserCreatedEvent` como señal de dominio/audit — Nest `EventBus` no espera handlers (ADR-0002), así que la generación **no** vive en el `@EventsHandler`.

**Deadline de entrega:** antes del **2026-07-16 12:00 CDMX**.

## Stack

| Pieza | Detalle |
|-------|---------|
| App | `apps/api` (NestJS 11, TypeScript strict) |
| Workspace | Nx lite (`nx serve/build/test api`) |
| Persistencia | Firestore via `firebase-admin` + emulator |
| Seguridad | Helmet + throttle `POST /users` 20/min |
| OpenAPI | Swagger UI en `/api/docs` (+ `/api/docs-json`) |
| Tests | Jest ≥ 80 % statements + smoke create→password |
| CI | GitHub Actions — API build/`test:cov` + Terraform validate |
| IaC | `infra/` Terraform (validate/plan; apply opcional) |

## Arquitectura (breve)

El módulo `users` está armado con **arquitectura hexagonal** (Clean Architecture) y **CQRS**:

| Capa | Qué hace |
|------|----------|
| `domain/` | Entidad `User`, puertos, errores y el evento `UserCreatedEvent`. Sin Nest ni Firebase. |
| `application/` | Comandos, consultas y handlers (cada uno en su archivo). También el servicio que completa el password. |
| `infrastructure/` | Firestore, bcrypt / generador seguro, controller HTTP y DTOs. |
| HTTP | Controllers finos: validan el body y delegan al `CommandBus` / `QueryBus`. |

**Alta sin password** (sin loops ni doble escritura):

1. Se guarda el usuario en una transacción (`emails/{email}` + `users/{id}`).
2. Se espera a `FinalizeMissingPasswordService`: genera el password, lo hashea con bcrypt y actualiza el documento.
3. Se publica `UserCreatedEvent` solo como aviso de auditoría (`UserCreatedAuditHandler` escribe un log). El `EventBus` de Nest **no espera** a los handlers, así que ahí **no** se vuelve a mutar el password.

Más detalle: [`docs/adr/0002`](./docs/adr/0002-backend-hexagonal-cqrs.md) y [`docs/infra/`](./docs/infra/).

## Prerrequisitos

- Node.js 20+
- npm
- Firebase CLI (`npm i -g firebase-tools`) para emulator
- Terraform (opcional en local; validado en CI)

## Setup rápido

```bash
cp .env.example .env
npm install                          # Nx (raíz)
cd apps/api && npm install && cd ../..
```

### Emulator + API

```bash
# terminal 1
firebase emulators:start --only firestore

# terminal 2
npm run api:serve
# o: cd apps/api && npm run start:dev
```

Health: `GET http://localhost:3000/api/v1/health`  
Swagger UI: [http://localhost:3000/api/docs](http://localhost:3000/api/docs) (OpenAPI JSON: `/api/docs-json`)

### Crear usuario

```bash
# sin password → genera hash seguro y responde con hasPassword:true
curl -s -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"username":"jane","email":"jane@example.com"}'

# con password
curl -s -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"username":"john","email":"john@example.com","password":"secret123"}'

# leer (nunca expone password/hash)
curl -s http://localhost:3000/api/v1/users/<id>

# listar todos
curl -s http://localhost:3000/api/v1/users
```

`POST /api/v1/users` está limitado a **20 req/min** (HTTP 429 si se supera).

Si falla la generación/persistencia del password tras el insert, el create no responde 201 y se intenta borrar el documento (best-effort; un crash a mitad podría dejar un huérfano residual).

El **email** es único (trim + lowercase). Un duplicado responde **409 Conflict**. Claim `emails/{email}` + doc `users/{id}` se escriben en la misma **transacción** Firestore (sin claim huérfano si falla el write del user).

### Respuestas de error (curl)

Contrato completo en Swagger. Ejemplos rápidos:

```bash
# 400 — email inválido
curl -s -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"username":"bad","email":"not-an-email"}'

# 409 — email duplicado (ejecutar dos veces el mismo email)
curl -s -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"username":"dup","email":"dup@example.com"}'

# 404 — usuario inexistente
curl -s http://localhost:3000/api/v1/users/00000000-0000-0000-0000-000000000000

# 429 — superar 20 POST /users en 1 min (repetir create rápido)
```

Cuerpos de error: validación → `{ statusCode, message[] }`; dominio → `{ statusCode, code, message }` (`NOT_FOUND`, `CONFLICT`, etc.).

## Troubleshooting

| Síntoma | Causa probable | Qué hacer |
|---------|----------------|-----------|
| API no arranca / error Firebase | Falta `.env` o `FIREBASE_PROJECT_ID` | `cp .env.example .env`; debe coincidir con `.firebaserc` (`demo-reto-geekscastle`) |
| `ECONNREFUSED` / 502 al crear user | Emulator apagado o host/puerto mal | Terminal 1: `firebase emulators:start --only firestore`; `.env`: `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` |
| Puerto 8080 o 3000 en uso | Otro proceso | Cambiar puerto emulator en `firebase.json` y actualizar `.env` / `PORT` |
| Swagger UI en blanco | CSP estricto | Ya relajado en `main.ts` para `/api/docs`; recargar tras `npm run api:serve` |
| `GET /health` ok pero writes fallan | Health no prueba Firestore | Verificar emulator UI en `:4000` y logs de la API |

**Nota:** `firestore.rules` incluye una regla abierta temporal (expira 2026-08-14) generada por Firebase CLI para demo local. La API usa **Admin SDK** (backend); no depende de reglas de cliente para el flujo del reto.

## Tests

```bash
npm run test:cov
# o: cd apps/api && npm run test:cov

# smoke create-without-password → persisted hash
cd apps/api && npm run test:smoke
```

Umbral: `coverageThreshold.global.statements: 80`.

## CI

`.github/workflows/ci.yml`:

- **api** — Node 20: `npm ci` → `build` → `test:cov`
- **terraform** — `fmt -check` + `init -backend=false` + `validate` en `infra/`

## Terraform lite

Ver [`infra/README.md`](./infra/README.md). El challenge se demuestra con **emulator**, no con `terraform apply`.

## Cómo lo desplegaría en GCP

> Solo documentación. Para este reto **no** hay que subir nada a la nube: la demo se hace con el emulador y `npm run api:serve`.

En producción usaría **Cloud Run** para la API, **Firestore** para los datos y, más adelante, **Pub/Sub** + una **Cloud Function** (o un worker pequeño en Cloud Run) para lo asíncrono.

### Decisiones

- **Cloud Run para Nest.** La API es un proceso HTTP con Nest, CQRS, Swagger, Helmet y rate limit. Encaja bien en un contenedor que escala (incluso a cero) y trae HTTPS sin montar un cluster.
- **Firestore nativo.** Misma base que en local, vía Admin SDK. El Terraform de `infra/` ya deja armada la base Native.
- **Pub/Sub / Cloud Functions para el “después”.** En local el evento vive dentro de Nest. En prod sacaría la auditoría / notificaciones del request HTTP, **sin** regenerar el password en el consumidor.
- **No pondría Nest entero en Cloud Functions.** El cold start y el modelo de ejecución no ayudan a este tipo de app. Una Function sí sirve como worker ligero escuchando Pub/Sub.

### Esquema

```text
Cliente (HTTPS)
       │
       ▼
  Cloud Armor / API Gateway   ← opcional, frente a Internet
       │
       ▼
  Cloud Run  (API Nest)
       │  Admin SDK + cuenta de servicio del propio Cloud Run
       ├─────────────►  Firestore  (users, emails)
       │
       │  cuando el create ya terminó bien (password listo)
       └─────────────►  Pub/Sub  topic: user.created
                              │
                              ▼
                     Cloud Function (o otro Cloud Run)
                     log / correo / métricas
                     (idempotente; no toca el password)
```

### Local frente a producción

| | Local (lo que entregamos) | GCP |
|--|---------------------------|-----|
| Datos | Emulador en `:8080` | Firestore del proyecto |
| Cómo se autentica Admin SDK | Con `FIRESTORE_EMULATOR_HOST` | Cuenta de servicio de Cloud Run (ADC); sin JSON en el repo |
| Config | Archivo `.env` | Variables del servicio + Secret Manager |
| Variable del emulador | Obligatoria | **No debe existir** |
| Evento | `EventBus` de Nest en el mismo proceso | Mensaje a Pub/Sub **después** de completar el password |
| Secretos | Fuera de Git | Secret Manager / IAM |

### Orden práctico para subirla

1. Crear el proyecto GCP, activar facturación y elegir región (la misma idea que en `infra/`).
2. Levantar Firestore con `terraform -chdir=infra apply` (o a mano en la consola). Colecciones: `users` y `emails`.
3. Crear una **cuenta de servicio** solo para Cloud Run, con lo mínimo: lectura/escritura en Firestore y, si emite eventos, permiso de publicar en Pub/Sub. Sin bajar un JSON al repositorio.
4. Empaquetar la API en una imagen Docker en dos etapas (build → `node dist/main`), usuario no root, y subirla a **Artifact Registry**.
5. Desplegar esa imagen en **Cloud Run** con:
   - `PORT` (Cloud Run lo pone; Nest lo lee),
   - `FIREBASE_PROJECT_ID` = id real del proyecto,
   - **sin** `FIRESTORE_EMULATOR_HOST`,
   - secretos (si aparecen) montados desde Secret Manager.
6. Usar `GET /api/v1/health` como chequeo. Con cero instancias se ahorra; con una se gana latencia en frío.
7. Ampliar el CI que ya tenemos: además del build y `test:cov`, construir la imagen, empujarla al registry y hacer `gcloud run deploy` solo desde `main` o tags. Terraform validate ya corre en Actions.
8. Seguir la app con Cloud Logging, Error Reporting y alertas de 5xx / latencia.

### Eventos en la nube (sin ciclos)

Misma regla que en local ([ADR-0002](./docs/adr/0002-backend-hexagonal-cqrs.md)):

1. Se crea el usuario (y el claim del email).
2. Se espera a que `FinalizeMissingPasswordService` genere y persista el hash. **Ese es el único camino que escribe el password.**
3. Se responde **201** cuando el documento ya quedó listo.
4. Recién ahí se publica `user.created` en Pub/Sub.

Quien consuma el mensaje (Function o worker) debe poder **correr dos veces el mismo evento sin romper nada** (por ejemplo claveando por `userId` + id del mensaje) y limitarse a observar: auditoría, correo de bienvenida, métricas. Si ahí se regenerara el password, volvemos a los ciclos y a la doble mutación que el reto pide evitar.

Hoy el `UserCreatedAuditHandler` es el prototipo en proceso. El mensaje de Pub/Sub puede llevar el mismo contenido (`userId`, si faltaba password).

### Seguridad operativa

- La imagen no lleva `.env` ni archivos de cuenta de servicio.
- La cuenta de Cloud Run solo con los roles que necesita.
- El rate limit de `POST /users` (20/min) se queda en la app; si crece el tráfico, se suma algo en el borde (p. ej. Cloud Armor).
- Login de clientes no entra en este MVP (ver ADR-0005). En prod típico iría JWT / Identity Platform delante de Cloud Run.
- Las reglas de Firestore para clientes **no** reemplazan al Admin SDK: en este diseño escribe el backend.

## Documentación

| Doc | Contenido |
|-----|-----------|
| [docs/requirements/reto.md](./docs/requirements/reto.md) | Historias US-01…US-22 |
| [docs/adr/](./docs/adr/) | ADRs 0001–0007 |
| [openspec/specs/](./openspec/specs/) | Specs vivas (OpenSpec) |
| [openspec/changes/archive/](./openspec/changes/archive/) | Changes archivados |
| [docs/reviews/latest.md](./docs/reviews/latest.md) | Último code review |

## Project board

[GitHub Project — Reto Geekscastle Backend](https://github.com/users/AndresED/projects/7/views/1)
