# ADR-0004: Integración continua con GitHub Actions

## Enmienda (2026-07-03 — lint y build)

Se añadieron **lint** y **build** como gates en los jobs `api` y `web` antes de `test:cov`. Motivo: detectar errores de tipos y estilo sin depender solo de tests. Detalle de seguridad (throttle, CORS, etc.): [ADR-0005](./0005-seguridad-api-y-limites.md).

## Estado

Aceptado

## Fecha

2026-07-03

## Alcance

Este ADR documenta **CI** (integración continua) en el monorepo: qué corre en remoto, qué queda manual, y por qué **CD** (despliegue continuo) no forma parte del reto v1.

| ADR | Alcance |
|-----|---------|
| [ADR-0001](./0001-monorepo-docker-compose.md) | Monorepo, Docker Compose, estrategia de tests a nivel repo |
| **ADR-0004** (este) | GitHub Actions CI, gates en `main`, límites de alcance |
| [delivery spec](/openspec/specs/delivery/spec.md) | Requisito canónico *Continuous Integration for Unit Tests* |

## Contexto

El reto exige cobertura unitaria ≥ 85 % en backend y documentación de cómo ejecutar tests. Tras varias iteraciones de hardening, el equipo añadió `.github/workflows/ci.yml` para que push/PR a `main` ejecuten tests sin depender de que cada evaluador los corra en local.

ADR-0001 describe la estrategia de tests (Jest, Vitest, Playwright) pero no el **proveedor** ni el **alcance del pipeline remoto**. El delivery spec ya exige CI para unitarios y deja E2E como manual.

## Elección final

| Área | Decisión adoptada |
|------|-------------------|
| Plataforma CI | **GitHub Actions** (`.github/workflows/ci.yml`) |
| Triggers | `push` y `pull_request` a `main` |
| Jobs | Tres en paralelo: `api`, `web`, `docker` |
| Node | `20` (`actions/setup-node@v4`) |
| Instalación | `npm ci` por app (`apps/api`, `apps/web`) |
| Gate API | `npm run lint:ci` → `npm run build` → `npm run test:cov` (umbral ≥ 85 % en Jest) |
| Gate web | `npm run lint` → `npm run build` → `npm run test:cov` (umbral ≥ 80 % statements en Vitest) |
| Gate Docker | `docker compose build` + `up -d` + `GET /health` 200 + UI `:80` responde |
| E2E Playwright | **No** en CI (interacción browser; manual en host) |
| Lint / typecheck | **Sí** — `lint:ci` + `build` en jobs `api` y `web` (enmienda 2026-07-03) |
| CD / deploy automático | **Fuera de alcance** reto v1 (Compose local sigue siendo entrega) |
| Orquestación cloud | Sin ECR/ECS/K8s — coherente con ADR-0001 |

## Decisión

Adoptar **GitHub Actions** con dos jobs independientes que ejecutan los mismos comandos documentados en README. No añadir CD hasta existir un entorno remoto objetivo (staging/prod) acordado; el reto se evalúa con `docker compose up --build`.

### Workflow (resumen)

```
push/PR → main
    ├── job api    → checkout → setup-node 20 → npm ci → lint:ci → build → test:cov
    ├── job web    → checkout → setup-node 20 → npm ci → lint → build → test:cov (≥80 %)
    └── job docker → checkout → compose build → compose up → /health + web smoke → down -v
```

Cada job usa `cache-dependency-path` apuntando al `package-lock.json` de su app (monorepo sin workspaces en raíz).

### Fuera de alcance v1

- **Playwright en CI:** el job `docker` valida build y arranque; los escenarios browser siguen siendo manuales (`npm run test:e2e`).
- **CD:** publicar imágenes a un registry o desplegar en cloud contradice el alcance “un clone + compose” de ADR-0001.
- **Monorepo tooling:** los jobs `api`/`web` usan npm por app; `docker` corre desde la raíz del repo.

## Alternativas consideradas

### A. Sin CI remoto (solo README)

**Pros:** Cero mantenimiento de workflow.  
**Contras:** Regresiones en `main` sin gate; evaluadores deben confiar en ejecución local.  
**Veredicto:** Descartada tras change `add-github-actions-ci`.

### B. Un solo job secuencial api → web

**Pros:** Un runner, log único.  
**Contras:** Mayor latencia; fallos independientes mezclados.  
**Veredicto:** Descartada; jobs paralelos son estándar y más rápidos.

### C. CI con Docker Compose build + smoke (elegida en job `docker`)

**Pros:** Mismo flujo que el evaluador (`compose build`/`up`); detecta SIGSEGV y errores de imagen antes del merge.  
**Contras:** Minutos extra de CI y pull de imágenes base.  
**Veredicto:** Job `docker` en v1 — sin Playwright en runner.

### D. CI con Docker-in-Docker + E2E Playwright

**Pros:** Gate de aceptación fullstack en cada PR.  
**Contras:** Tiempo de CI, caché de imágenes, flakes de red/PokeAPI; duplica lo que el evaluador ya puede correr con `npm run test:e2e`.  
**Veredicto:** Descartada para v1; documentada como evolución posible.

### E. Azure Pipelines / GitLab CI

**Pros:** Equivalente funcional.  
**Contras:** Repo en GitHub; Actions es nativo y suficiente.  
**Veredicto:** Descartada.

## Consecuencias

### Positivas

- `main` protegida por tests automáticos alineados con el reto (cobertura API).
- Job `docker` replica el camino del evaluador (`compose build`/`up`) en cada push/PR.
- Misma superficie que desarrollo local: mismos comandos, menos sorpresas.
- Delivery spec y README pueden referenciar un artefacto concreto (workflow path).

### Negativas / trade-offs

- E2E Playwright no bloquea merge; regresiones de UI solo se detectan en local.
- Sin CD, “release” sigue siendo tag manual + `docker compose` en máquina del evaluador.
- Dos `package-lock.json` → dos caches; aceptable con dos apps.

## Evolución (CD — no implementado)

Si el proyecto sale del reto hacia un entorno remoto, documentar en **enmienda** o ADR hijo:

1. **Destino** (ej. ECR + ECS, Fly.io, Railway).
2. **Trigger** (tag semver, merge a `main`, manual `workflow_dispatch`).
3. **Artefactos** (imágenes `api`/`web` con tag inmutable git sha).
4. **Secretos** (registry, DB URL) vía GitHub Environments — nunca en repo.
5. **E2E opcional** como job previo al deploy o smoke post-deploy.

Hasta entonces, ADR-0001 sigue siendo la fuente de verdad para **cómo** se despliega (Compose).

## Criterios de aceptación

- [ ] Existe `.github/workflows/ci.yml` con jobs `api` y `web` en push/PR a `main`.
- [ ] README sección *CI (GitHub Actions)* describe comandos y exclusión de E2E.
- [ ] `openspec/specs/delivery/spec.md` requirement *Continuous Integration for Unit Tests* satisfecho.
- [ ] CD **no** se documenta como implementado hasta existir workflow de deploy.

## Referencias

- [ADR-0001 — Monorepo y Docker Compose](./0001-monorepo-docker-compose.md)
- [delivery spec — CI](/openspec/specs/delivery/spec.md)
- [README — CI](/README.md)
- Change archivado: `openspec/changes/archive/2026-07-03-add-github-actions-ci/`
