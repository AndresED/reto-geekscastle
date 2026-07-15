# ADR-0006: Nx workspace lite (señal de stack + delivery)

## Estado

Aceptado

## Fecha

2026-07-15

## Alcance

Cómo incorporar **Nx** sin convertir el reto PDF en un monorepo multi-app.

| Relacionado | ADR |
|-------------|-----|
| Layout repo | [ADR-0001](./0001-estructura-proyecto-nestjs.md) |
| CI | [ADR-0004](./0004-ci-github-actions.md) |

## Contexto

El PDF del challenge exige NestJS + TypeScript + Firebase + Clean Architecture.  
En el proceso de postulación, el contacto pidió experiencia adicional en **Nx** (y Terraform — ADR-0007).

Hay entrega dura: **antes del jueves 16-jul-2026 12:00 CDMX**. Un Nx “full” (muchas libs, generators, module boundaries complejos) resta tiempo al flujo User/evento/password.

## Elección final

| Área | Decisión |
|------|----------|
| Nx | **Sí — workspace lite** |
| Apps | Una sola: `apps/api` (Nest) |
| Libs | Mínimas o ninguna en v1 (el código hexagonal vive dentro de `apps/api`) |
| Package manager | npm + Nx |
| Generators | Solo scaffold inicial; no proliferar libs “por si acaso” |
| Boundaries estrictos Nx | Fuera de alcance v1 |
| Frontend app | No |

## Decisión

Usar Nx como **orquestador del workspace** (targets `serve`, `build`, `test`) con un único proyecto Nest `apps/api`. Demuestra criterio Nx sin over-engineering.

Scripts raíz típicos:

```json
"api:serve": "nx serve api",
"api:build": "nx build api",
"api:test": "nx test api",
"api:test:cov": "nx test api --coverage"
```

CI invoca los mismos targets (ADR-0004 se alinea a Nx).

### Enmienda a ADR-0001

La estructura “servicio en raíz `src/`” se **reemplaza** por:

```
apps/api/src/...   # Nest hexagonal + CQRS
infra/             # Terraform (ADR-0007)
docs/
openspec/
nx.json
```

## Alternativas consideradas

### A. Sin Nx (solo Nest en raíz)

Cumple el PDF; no responde la señal del proceso. **Descartada.**

### B. Nx + varias libs (`domain`, `application`, …)

**Pros:** boundaries explícitos. **Contras:** tiempo y ruido para un solo bounded context. **Descartada v1.**

### C. Nx lite + `apps/api` (elegida)

Señal clara, costo acotado.

## Consecuencias

- Evaluador corre `nx`/`npm` scripts documentados; el core del reto no cambia.
- Si el tiempo aprieta: **prioridad P0** sigue siendo users+Firebase+tests; Nx no debe bloquear el happy path.

## Criterios de aceptación

- [x] Workspace Nx con proyecto `api`.
- [x] README documenta comandos Nx (o npm wrappers).
- [x] CI usa build/test del proyecto `api`.
- [x] No hay apps FE/libs especulativas en v1.
