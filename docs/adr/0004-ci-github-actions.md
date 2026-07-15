# ADR-0004: CI con GitHub Actions (build + tests)

## Estado

Aceptado

## Enmienda (2026-07-15 — Terraform en CI)

Job adicional `terraform`: `fmt -check` + `init -backend=false` + `validate` sobre `infra/` (sin credenciales GCP).

## Fecha

2026-07-15

## Alcance

Integración continua remota. CD fuera de alcance.

## Contexto

El equipo exige validar que el proyecto **compila** y que los **tests pasan** con umbral Jest ≥ **80 %**. El reto original pide tests unitarios pero no CI; el CI es requisito de entrega del equipo.

## Elección final

| Área | Decisión |
|------|----------|
| Plataforma | GitHub Actions |
| Archivo | `.github/workflows/ci.yml` |
| Triggers | `push` y `pull_request` a `main` (y `master` si existe) |
| Node | `20` LTS |
| Steps | `npm ci` → build proyecto `api` (Nx) → `test:cov` ≥ 80 % |
| Coverage | Jest `coverageThreshold.global.statements: 80` |
| Emulator Firebase en CI | **No** (unit tests con mocks) |
| Lint | Opcional v1; añadir si el scaffold trae ESLint sin fricción |
| CD | Fuera de alcance |

## Decisión

Un job `api` (nombre libre) que falle si:

1. TypeScript/Nest no compila.
2. Algún test falla.
3. Coverage global statements < 80 %.

### Workflow (resumen)

```
push/PR → main
  ├── job api       → checkout → setup-node 20 → npm ci → build → test:cov
  └── job terraform → checkout → setup-terraform → fmt -check → init -backend=false → validate
```

## Alternativas consideradas

### A. Solo README “corre los tests”

Sin gate remoto. **Descartada.**

### B. CI con Firebase emulator

Más fiel, más lento y frágil. **Fuera de v1**; evolución posible.

### C. GitHub Actions build+test (elegida)

Mínimo que cumple el requisito del equipo.

## Consecuencias

- Hay que inicializar git + remote GitHub para que Actions corra.
- El umbral vive en `jest` config; CI solo ejecuta el script.

## Criterios de aceptación

- [x] Existe `.github/workflows/ci.yml`.
- [x] README sección CI.
- [x] Pipeline rojo si coverage < 80 % o build falla.
