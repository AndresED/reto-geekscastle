# Documentación del reto Pokemon

## Por audiencia

### Evaluador

1. [README — inicio rápido](/README.md) (`docker compose up --build`)
2. [Requisitos del reto (US-01 – US-27)](/docs/requirements/reto.md)
3. [C4 y flujos](/docs/infra/c4-y-flujos.md)
4. [Guía del desarrollador](/docs/guia-desarrollador.md) — tests, troubleshooting
5. Swagger en `http://localhost:3000/api/docs` (con el stack levantado)

### Desarrollador

- **[Guía del desarrollador](/docs/guia-desarrollador.md)** — arquitectura, estilo, levantar local, tests (Jest, Vitest, Playwright), [solución de problemas](/docs/guia-desarrollador.md#solución-de-problemas)
- [README raíz — desarrollo local](/README.md#desarrollo-local)
- `apps/api/README.md` y `apps/web/README.md` — comandos por app



## Decisiones de arquitectura (ADR)


| ADR                                                                   | Tema                                           |
| --------------------------------------------------------------------- | ---------------------------------------------- |
| [0001](/docs/adr/0001-monorepo-docker-compose.md)                     | Monorepo, Docker Compose, estrategia de tests  |
| [0002](/docs/adr/0002-backend-monolito-modular-hexagonal.md)          | Backend NestJS hexagonal                       |
| [0003](/docs/adr/0003-frontend-react-feature-based-tanstack-query.md) | Frontend React, TanStack Query                 |
| [0004](/docs/adr/0004-ci-github-actions.md)                           | CI (GitHub Actions)                            |
| [0005](/docs/adr/0005-seguridad-api-y-limites.md)                     | Seguridad: throttle, CORS, validación, límites |




## Infraestructura y datos


| Documento                                                 | Contenido                               |
| --------------------------------------------------------- | --------------------------------------- |
| [Infraestructura — resumen](/docs/infra/README.md)        | Stack, puertos, diagrama de servicios   |
| [C4 y diagramas de secuencia](/docs/infra/c4-y-flujos.md) | Contexto, contenedores, `POST /pokemon` |
| [Base de datos](/docs/infra/base-de-datos.md)             | ER y diccionario tabla `pokemon`        |




## Especificaciones, UI y revisiones


| Documento                                                     | Contenido                                     |
| ------------------------------------------------------------- | --------------------------------------------- |
| [OpenSpec — specs vivas](/openspec/specs/)                    | `backend`, `frontend`, `delivery`, `monorepo` |
| [Wireframes de referencia](/docs/ui/wireframes-referencia.md) | Layout del dashboard                          |
| [Último code review](/docs/reviews/latest.md)                 | Puntero al reporte más reciente               |




## Estructura de `docs/`

```
docs/
├── README.md              ← estás acá
├── guia-desarrollador.md
├── requirements/reto.md
├── adr/                   # ADR-0001 … 0005
├── infra/                 # C4, BD, resumen de stack
├── ui/                    # wireframes
└── reviews/               # informes de code review
```

