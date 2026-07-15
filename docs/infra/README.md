# Infra del producto — Users API

Acá está el modelo de datos y los diagramas C4 de **este** reto: Nest + Firestore.  
El Terraform (código) vive en la raíz: [`infra/`](../../infra/README.md).

> Si en algún archivo viejo ves Pokémon o Postgres, ignóralo: no es este producto.

## Qué hay aquí

| Doc | De qué va |
|-----|-----------|
| [Base de datos](./base-de-datos.md) | Colecciones `users` y `emails` |
| [C4 y flujos](./c4-y-flujos.md) | Contexto, contenedores y secuencias create/get |

## Cómo corre en local

```text
Tu cliente HTTP  →  Nest (:3000)  →  Firestore Emulator (:8080)
```

- Swagger: http://localhost:3000/api/docs  
- Setup y curls: [README raíz](../../README.md)  
- Variables: `.env.example`  
- Decisiones: [ADRs](../adr/) · explicación: [wiki](../wiki/README.md)

La demo evaluable usa el **emulador**. No hace falta `terraform apply` para corregir el reto.

## Tests / CI (atajo)

| Qué | Comando |
|-----|---------|
| Cobertura | `cd apps/api && npm run test:cov` |
| Smoke create→password | `cd apps/api && npm run test:smoke` |
| CI | build + `test:cov` + Terraform validate |
