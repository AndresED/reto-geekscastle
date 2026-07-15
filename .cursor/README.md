# Cursor — Review → OpenSpec workflow

Pipeline para revisar código, documentar hallazgos y refinarlos en cambios OpenSpec antes de implementar.

## Comandos

| Comando | Qué hace |
|---------|----------|
| `/code-review` | Review exhaustivo → reporte en `docs/reviews/` |
| `/review-to-openspec` | Reporte → uno o más `openspec/changes/<slug>/` |
| `/opsx:propose` | Crear change OpenSpec desde cero (sin review previo) |
| `/opsx:apply` | Implementar tasks de un change |
| `/opsx:archive` | Archivar change y sync specs canónicas |

## Flujo recomendado

```
1. /code-review              →  docs/reviews/YYYY-MM-DD-code-review.md
2. (humano) leer reporte     →  priorizar Critical / High
3. /review-to-openspec       →  openspec/changes/fix-foo/, fix-bar/, …
4. (humano) refinar proposal →  ajustar scope antes de codear
5. /opsx:apply fix-foo        →  implementación
6. /opsx:archive fix-foo      →  merge a openspec/specs/
```

## Rules que alimentan el review

Las rules en `.cursor/rules/*-review.mdc` y `reviewer.mdc` se aplican automáticamente en `apps/**`. El comando `/code-review` las referencia explícitamente para no omitir ninguna dimensión.

## Artefactos

| Ruta | Rol |
|------|-----|
| `docs/reviews/latest.md` | Puntero al último reporte |
| `docs/reviews/*.md` | Reportes con FINDING-xxx |
| `openspec/changes/<slug>/` | Refinamiento listo para apply |
