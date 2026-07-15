# Infraestructura del proyecto

> Si llegaste acá es porque querés entender cómo está armado todo sin meterte a leer el `docker-compose.yml` línea por línea. Perfecto, para eso está este doc.

El reto Pokemon es, en la práctica, **tres cosas corriendo juntas**: una web en React, una API en NestJS y una base PostgreSQL. Nada de Kubernetes ni microservicios por ahora; con `docker compose up --build` alcanza.

## Qué vas a encontrar acá


| Documento | Contenido |
|-----------|-----------|
| [Índice de documentación](/docs/README.md) | Mapa de toda la carpeta `docs/` |
| [Guía del desarrollador](/docs/guia-desarrollador.md) | Arquitectura, estilo de código, levantar app, tests (incl. Playwright), [solución de problemas](/docs/guia-desarrollador.md#solución-de-problemas) y ruta de code review |
| [Requisitos del reto](/docs/requirements/reto.md) | Historias de usuario y mapa a OpenSpec |
| [C4 y diagramas de secuencia](/docs/infra/c4-y-flujos.md) | Contexto, contenedores, componentes y flujo del `POST /pokemon` |
| [Base de datos](/docs/infra/base-de-datos.md)             | Diagrama ER + diccionario de la tabla `pokemon`                      |


Para decisiones formales (puertos, stack, ADRs) seguí mirando [docs/adr/](/docs/adr/).

## Resumen

```
Usuario  →  web (:80)  →  api (:3000)  →  PokeAPI (internet)
                              ↓
                            db (:5432)
```

- **web**: sitio compilado con Vite y servidor con nginx. Solo habla con nuestra API, nunca con PokeAPI directo.
- **api**: NestJS, arquitectura hexagonal ligera. Es el único que consulta PokeAPI y el único que escribe en la BD.
- **db**: PostgreSQL 16. Por ahora una sola tabla (`pokemon`).

Swagger queda en `http://localhost:3000/api/docs`, útil para probar sin abrir la interfaz web.

## Tests automatizados

| Capa | Herramienta | Dónde | Comando |
| ---- | ----------- | ----- | ------- |
| API unitarios | Jest | `apps/api` | `npm run test:cov` (≥85 % statements) |
| UI unitarios | Vitest | `apps/web` | `npm run test` |
| Aceptación E2E | **Playwright** | `apps/web/e2e/` | `npm run test:e2e` (con Docker arriba) |

Los E2E abren `http://localhost`, crean pokemon por la UI y verifican toasts, lista y persistencia. Instrucciones completas en la [guía del desarrollador — E2E](/docs/guia-desarrollador.md#e2e--aceptación-con-playwright).

## Cómo levantar todo

```bash
cp .env.example .env
docker compose up --build
```


| Servicio   | URL                                                              |
| ---------- | ---------------------------------------------------------------- |
| Panel web  | [http://localhost](http://localhost)                             |
| API        | [http://localhost:3000](http://localhost:3000)                   |
| Swagger    | [http://localhost:3000/api/docs](http://localhost:3000/api/docs) |
| PostgreSQL | localhost:5432 (solo si te conectás desde afuera del compose)    |


## Estructura del repo (lo mínimo)

```
reto/
├── apps/
│   ├── api/          # NestJS
│   └── web/          # React + Vite
├── docs/
│   ├── adr/          # decisiones de arquitectura
│   └── infra/        # ← estás acá
├── apps/web/e2e/     # tests Playwright (E2E)
├── docker-compose.yml
└── .env.example
```

## Nota sobre las respuestas de la API

Ojo: la API no devuelve el JSON “pelado” del pokemon. Todas las respuestas siguen **el mismo formato**: en éxito algo como `{ success, statusCode, data, timestamp }` y en error `{ success: false, message, error, ... }`. El frontend ya está preparado para eso; si probás con curl, fijate en el campo `data`.