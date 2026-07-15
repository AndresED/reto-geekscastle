# Reto GeeksCastle — Users API

[![CI](https://github.com/AndresED/reto-geekscastle/actions/workflows/ci.yml/badge.svg)](https://github.com/AndresED/reto-geekscastle/actions/workflows/ci.yml)

## 1. Qué es este reto

Es una entrega de backend para el challenge de **GeeksCastle**: una API de **usuarios** donde puedes **crear** un usuario, **consultarlo** y, si al crear **no mandas password**, el sistema te genera uno seguro, lo guarda hasheado y te responde recién cuando eso ya quedó listo.

El enunciado pide NestJS, TypeScript, Firebase y Clean Architecture. Además, en el proceso se pidió experiencia con **Nx** y **Terraform**: aquí van en modo *lite* (workspace + IaC acotada), sin distraer del núcleo del challenge.

**Fecha de entrega:** antes del **16 de julio 2026, 12:00 CDMX**.

No hace falta desplegar a la nube para evaluar: la demo corre en tu máquina con el **emulador de Firestore**.

---

## 2. Si estás revisando esto (empieza acá)

El código te cuenta *qué* hace la API. La documentación te cuenta *por qué* está armada así. Eso importa cuando evalúas arquitectura y decisiones.

| Prioridad | Dónde | Para qué |
|-----------|--------|----------|
| 1 | **[Wiki](./docs/wiki/README.md)** | Explicación en lenguaje claro: hexagonal, CQRS, onboarding, Pub/Sub a futuro |
| 2 | **[ADRs](./docs/adr/)** | Decisiones cortas y vinculantes (stack, capas, Firebase, seguridad, CI, Nx, Terraform) |
| 3 | Este README | Levantar, probar con `curl` y panorama de entrega |
| 4 | [Swagger](http://localhost:3000/api/docs) | Contrato HTTP cuando la API ya está arriba |
| 5 | [Historias US](./docs/requirements/reto.md) | Criterios de aceptación US-01…US-22 |

**Lectura sugerida de la wiki (≈45 min):**

1. [Camino del desarrollador](./docs/wiki/camino-del-desarrollador.md)
2. [Arquitectura](./docs/wiki/arquitectura.md)
3. [Toma de decisiones](./docs/wiki/toma-de-decisiones.md)

**ADR que más te conviene abrir primero:** [ADR-0002 — Hexagonal + CQRS](./docs/adr/0002-backend-hexagonal-cqrs.md) (incluye por qué el password se finaliza con `await` y el evento es solo aviso).

Si la wiki y un ADR no coinciden, **manda el ADR**.

---

## 3. Qué puedes hacer con la API

| Acción | Endpoint | En una frase |
|--------|----------|--------------|
| Crear usuario | `POST /api/v1/users` | Con o sin `password`; si falta, se genera y se hashea antes del `201` |
| Ver uno | `GET /api/v1/users/:id` | Datos públicos; nunca password ni hash |
| Listar | `GET /api/v1/users` | Hasta 100 filas; si no hay nadie, `[]` |
| Salud | `GET /api/v1/health` | Para ver que el proceso vive |

Otras reglas útiles:

- El **email** es único → duplicado = `409`.
- Las rutas `/users` tienen **límite de 20 peticiones/min por IP** → exceso = `429`.
- `health` **no** entra en ese cupo.
- Login / JWT **no** forman parte de este MVP ([ADR-0005](./docs/adr/0005-seguridad-passwords-y-api.md)).

---

## 4. Cómo levantarlo

### Qué necesitas

- Node.js 20+
- npm
- [Firebase CLI](https://firebase.google.com/docs/cli) (`npm i -g firebase-tools`)
- Terraform solo si quieres mirar el IaC (en CI ya se valida)

### Instalar

```bash
cp .env.example .env
npm install                          # workspace Nx (raíz)
cd apps/api && npm install && cd ../..
```

### Encender emulador + API

Necesitas **dos terminales**:

```bash
# terminal 1 — datos
firebase emulators:start --only firestore

# terminal 2 — API
npm run api:serve
```

Cuando esté arriba:

- Health: http://localhost:3000/api/v1/health  
- Swagger: http://localhost:3000/api/docs  

Si algo no arranca, salta a [Troubleshooting](#9-troubleshooting).

---

## 5. Probarlo rápido (`curl`)

```bash
# Alta sin password → el sistema genera y hashea; hasPassword queda en true
curl -s -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"username":"jane","email":"jane@example.com"}'

# Alta con password
curl -s -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"username":"john","email":"john@example.com","password":"secret123"}'

# Leer (cambia <id> por el que te devolvió el create)
curl -s http://localhost:3000/api/v1/users/<id>

# Listar
curl -s http://localhost:3000/api/v1/users
```

### Errores que puedes provocar

```bash
# 400 — email inválido
curl -s -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"username":"bad","email":"not-an-email"}'

# 409 — email ya registrado (manda dos veces el mismo)
curl -s -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"username":"dup","email":"dup@example.com"}'

# 404 — id que no existe
curl -s http://localhost:3000/api/v1/users/00000000-0000-0000-0000-000000000000
```

El detalle de esquemas está en Swagger. La historia “create → password listo → aviso de dominio” está explicada sin rodeos en la [wiki de arquitectura](./docs/wiki/arquitectura.md) y en el [ADR-0002](./docs/adr/0002-backend-hexagonal-cqrs.md).

---

## 6. Cómo está pensada la solución (breve)

Ordenada por capas: el **dominio** (qué es un usuario) no sabe de Nest ni de Firebase; la **aplicación** orquesta comandos y consultas (CQRS); la **infraestructura** habla con Firestore, bcrypt y HTTP.

Flujo del create **sin** password, en corto:

1. Se guarda el usuario (email único en una transacción).
2. Se espera a que el password quede generado, hasheado y persistido.
3. Recién ahí responde `201`.
4. Después se publica un **aviso** de dominio (hoy: log de auditoría). Ese aviso **no** vuelve a tocar el password.

¿Por qué no se genera el password “en el evento” de Nest? Porque el `EventBus` no garantiza esperar a los handlers: si lo hicieras ahí, podrías mentir el `201`. Eso está escrito a propósito en la wiki y en:

- [finalize await vs `@EventsHandler`](./docs/architecture/finalize-await-vs-events-handler.md)
- [ADR-0002](./docs/adr/0002-backend-hexagonal-cqrs.md)

Para el “mapa mental” y analogías (restaurante, ventanillas, enchufes): **[docs/wiki/arquitectura.md](./docs/wiki/arquitectura.md)**.

---

## 7. Tests y CI

```bash
npm run test:cov
# o: cd apps/api && npm run test:cov

# smoke: create sin password → hash persistido
cd apps/api && npm run test:smoke
```

Umbral de cobertura: **80 %** de statements (Jest + CI).

GitHub Actions (`.github/workflows/ci.yml`):

- **api** — install → build → `test:cov`
- **terraform** — `fmt` + `validate` en `infra/`

Detalle: [ADR-0004](./docs/adr/0004-ci-github-actions.md).

---

## 8. Stack (cuando ya viste el flujo)

| Pieza | Detalle |
|-------|---------|
| App | `apps/api` — NestJS 11, TypeScript strict |
| Workspace | Nx lite (`nx serve/build/test api`) — [ADR-0006](./docs/adr/0006-nx-workspace-lite.md) |
| Datos | Firestore (Admin SDK) + emulator — [ADR-0003](./docs/adr/0003-firebase-firestore-emulator.md) |
| Seguridad | Helmet + throttle 20/min en `/users` — [ADR-0005](./docs/adr/0005-seguridad-passwords-y-api.md) |
| Contrato | Swagger en `/api/docs` |
| IaC | Terraform lite en `infra/` — [ADR-0007](./docs/adr/0007-terraform-firebase-lite.md) |

Terraform: ver [`infra/README.md`](./infra/README.md). La demo del challenge es con **emulator**, no con `terraform apply`.

---

## 9. Troubleshooting

| Síntoma | Causa probable | Qué hacer |
|---------|----------------|-----------|
| La API no arranca / error Firebase | Falta `.env` o project id | `cp .env.example .env`; debe cuadrar con `.firebaserc` (`demo-reto-geekscastle`) |
| `ECONNREFUSED` / 502 al crear | Emulator apagado | Terminal 1 con `firebase emulators:start --only firestore`; `.env`: `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` |
| Puerto 8080 o 3000 ocupado | Otro proceso | Cambia puerto en `firebase.json` / `PORT` |
| Swagger en blanco | CSP | Ya relajado en `main.ts` para `/api/docs`; recarga tras `npm run api:serve` |
| Health ok pero el create falla | Health no prueba Firestore | Mira la UI del emulator (`:4000`) y los logs de la API |

**Nota:** `firestore.rules` trae una regla abierta temporal de demo (caduca 2026-08-14). La API usa **Admin SDK**; el flujo del reto no depende de reglas de cliente.

Si falla generar/persistir el password después del insert, **no** hay `201` y se intenta borrar el documento (best-effort). Detalle en ADR-0002.

---

## 10. Cómo lo desplegaría en GCP (solo diseño)

> No hace falta subirlo a la nube para este reto. Esto responde a “¿cómo lo pondrías en producción?”.

Usaría **Cloud Run** (API Nest), **Firestore** (datos) y, más adelante, **Pub/Sub** + un worker ligero para lo asíncrono (auditoría, mails, métricas) — **sin** regenerar password en el consumidor.

```text
Cliente → Cloud Run (Nest) → Firestore
                 │
                 └─► Pub/Sub → Function/worker (solo efectos de observación)
```

| | Local (lo entregado) | GCP |
|--|----------------------|-----|
| Datos | Emulator `:8080` | Firestore del proyecto |
| Auth Admin SDK | `FIRESTORE_EMULATOR_HOST` | Cuenta de servicio de Cloud Run (ADC) |
| Evento | `EventBus` en el mismo proceso | Mensaje Pub/Sub **después** del password listo |
| Secretos | Fuera de Git | Secret Manager / IAM |

Más narrativa y pasos: abajo se mantiene el detalle; el “por qué” de sacar el evento a Pub/Sub está en la wiki: [Futuro Pub/Sub](./docs/wiki/futuro-pubsub.md).

### Decisiones de despliegue

- **Cloud Run** para Nest (proceso HTTP, escala, HTTPS).
- **Firestore nativo** vía Admin SDK; Terraform en `infra/` deja la base preparada.
- **Pub/Sub / Function** para el “después” del request; mismo contrato que el audit local.
- Nest completo en Cloud Functions: no (cold start / modelo poco amigable). Una Function sí como oyente.

### Orden práctico

1. Proyecto GCP + región (alineada a `infra/`).
2. Firestore con `terraform -chdir=infra apply` (o consola). Colecciones `users` y `emails`.
3. Cuenta de servicio de Cloud Run con lo mínimo (Firestore ± Pub/Sub publish). Sin JSON en el repo.
4. Imagen Docker multi-stage → Artifact Registry.
5. Deploy Cloud Run: `PORT`, `FIREBASE_PROJECT_ID`, **sin** `FIRESTORE_EMULATOR_HOST`, secretos desde Secret Manager.
6. Health check en `/api/v1/health`.
7. CI: además de build/tests, imagen + deploy desde `main`/tags.
8. Logging / Error Reporting / alertas 5xx.

### Eventos en la nube (misma regla que en local)

1. Create (+ claim de email).  
2. Await finalize del password.  
3. Responder `201`.  
4. Publicar `user.created`.  

Consumidor **idempotente** y sin tocar `passwordHash`. Hoy el prototipo es `UserCreatedAuditHandler` en proceso.

### Seguridad operativa

- Sin `.env` ni service accounts en la imagen.
- IAM mínimo en Cloud Run.
- Throttle en app; en borde se puede sumar Cloud Armor.
- Auth de clientes fuera de este MVP.
- Reglas Firestore de cliente ≠ Admin SDK del backend.

---

## 11. Mapa de documentación

### Wiki — guía principal

| Doc | Contenido |
|-----|-----------|
| [Índice](./docs/wiki/README.md) | Por dónde empezar |
| [Camino del desarrollador](./docs/wiki/camino-del-desarrollador.md) | Onboarding y cómo agregar features |
| [Arquitectura](./docs/wiki/arquitectura.md) | Hexagonal + CQRS con analogías |
| [Toma de decisiones](./docs/wiki/toma-de-decisiones.md) | Cuándo ADR / OpenSpec / wiki |
| [Futuro Pub/Sub](./docs/wiki/futuro-pubsub.md) | Evolución cloud sin romper el `201` |

### ADRs — decisiones que manda el diseño

| ADR | Tema |
|-----|------|
| [0001](./docs/adr/0001-estructura-proyecto-nestjs.md) | Estructura del repo / Nest |
| [0002](./docs/adr/0002-backend-hexagonal-cqrs.md) | Hexagonal + CQRS + finalize vs evento |
| [0003](./docs/adr/0003-firebase-firestore-emulator.md) | Firestore + emulator |
| [0004](./docs/adr/0004-ci-github-actions.md) | CI |
| [0005](./docs/adr/0005-seguridad-passwords-y-api.md) | Passwords, Helmet, throttle |
| [0006](./docs/adr/0006-nx-workspace-lite.md) | Nx lite |
| [0007](./docs/adr/0007-terraform-firebase-lite.md) | Terraform lite |

### Más

| Doc | Contenido |
|-----|-----------|
| [reto.md](./docs/requirements/reto.md) | Historias US-01…US-22 |
| [finalize vs EventsHandler](./docs/architecture/finalize-await-vs-events-handler.md) | Diseño profundo del password |
| [docs/infra/](./docs/infra/) | Modelo de datos + C4 |
| [openspec/specs/](./openspec/specs/) | Specs vivas |
| [reviews/latest](./docs/reviews/latest.md) | Último code review interno |

---

## Project board

[GitHub Project — Reto Geekscastle Backend](https://github.com/users/AndresED/projects/7/views/1)
