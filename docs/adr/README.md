# ADRs — Decisiones de arquitectura

Aquí quedan las **decisiones acordadas** del reto: cortas, por escrito y con estado (aceptadas).  
No son tutoriales; si quieres la explicación con calma, ve a la [wiki](../wiki/README.md).

**Cómo leerlas:** si hay duda entre wiki y un ADR, **manda el ADR**.

---

## Índice

| ADR | Título | De qué va (en corto) |
|-----|--------|----------------------|
| [0001](./0001-estructura-proyecto-nestjs.md) | Estructura del proyecto NestJS | Cómo está organizado el repo: Nest en `apps/api`, carpetas y bootstrap (con enmienda Nx). |
| [0002](./0002-backend-hexagonal-cqrs.md) | Backend hexagonal + CQRS | Capas domain/application/infrastructure, un archivo por command/query/handler, y por qué el password se finaliza con `await` (el evento solo avisa). |
| [0003](./0003-firebase-firestore-emulator.md) | Firebase Firestore + emulator | Persistencia con Admin SDK, emulador en local y por qué no Realtime DB / Auth como almacén del User. |
| [0004](./0004-ci-github-actions.md) | CI con GitHub Actions | Pipeline: build + `test:cov` (≥ 80 %) y validate de Terraform; sin deploy cloud en v1. |
| [0005](./0005-seguridad-passwords-y-api.md) | Seguridad: passwords y API | Generación CSPRNG, bcrypt, sin plaintext, validación, Helmet y throttle 20/min (health exento). |
| [0006](./0006-nx-workspace-lite.md) | Nx workspace lite | Monorepo mínimo con proyecto `api` para mostrar Nx sin inventar libs/FE de más. |
| [0007](./0007-terraform-firebase-lite.md) | Terraform para Firebase | Un Terraform pequeño para Firestore en GCP; para demostrar el reto usas el emulador. |

---

## Orden sugerido

1. **0002** — es el corazón de la arquitectura del módulo `users`.
2. **0003** y **0005** — datos y seguridad del create.
3. **0001** / **0006** — dónde vive el código y el workspace.
4. **0004** / **0007** — calidad en CI e IaC.

Arranque y curls: [README raíz](../../README.md).  
Historias US: [reto.md](../requirements/reto.md).
