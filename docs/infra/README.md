# Infraestructura — Users API (GeeksCastle)

Documentación de arquitectura y modelo de datos de **este** reto: NestJS Users API + **Firestore**, con IaC Terraform lite en la raíz del repo.

> Si ves menciones a Pokémon/PostgreSQL en algún archivo histórico, no aplican a este producto.

## Qué hay acá

| Documento | Contenido |
|-----------|-----------|
| [Base de datos (Firestore)](./base-de-datos.md) | Colecciones `users` y `emails` |
| [C4 y flujos](./c4-y-flujos.md) | Contexto, contenedores y secuencia de create/get |

## Terraform (IaC)

El código Terraform vive en **`infra/`** (raíz del monorepo), no en `docs/infra/`.

Ver [`../../infra/README.md`](../../infra/README.md): `fmt`, `validate`, `plan`. La demo evaluable usa el **Firestore Emulator**.

## Runtime local (resumen)

```
Cliente HTTP  →  Nest API (:3000)  →  Firestore Emulator (:8080)
```

- Setup y curls: [README raíz](../../README.md)
- Variables: `.env.example` (`FIREBASE_PROJECT_ID`, `FIRESTORE_EMULATOR_HOST`)
- ADRs: [docs/adr/](../adr/)

## Tests / CI

| Capa | Comando |
|------|---------|
| API unit + coverage | `cd apps/api && npm run test:cov` |
| Smoke create→password | `cd apps/api && npm run test:smoke` |
| CI | `.github/workflows/ci.yml` — build/`test:cov` + Terraform validate |
