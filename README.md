# Reto GeeksCastle — Users API

API NestJS (hexagonal + CQRS) + Firebase Firestore en **Nx lite**, con IaC **Terraform lite**. Password autogenerado vía evento al crear usuario si no se envía.

**Deadline de entrega:** antes del **2026-07-16 12:00 CDMX**.

## Documentación (empezar aquí)

| Documento | Contenido |
|-----------|-----------|
| [docs/requirements/reto.md](./docs/requirements/reto.md) | Historias US-01…US-22 (listas para GitHub) |
| [docs/adr/](./docs/adr/) | ADRs (Nest/CQRS/Firebase/CI/seguridad/Nx/Terraform) |
| [docs/README.md](./docs/README.md) | Índice de docs |
| [reto.md](./reto.md) | Enunciado original del reto |
| OpenSpec change | `openspec/changes/bootstrap-users-api/` |

## Estado actual

- Requisitos, ADRs (0001–0007) y OpenSpec **listos para implementar**.
- Código Nest / CI / infra: pendiente (`/opsx:apply` o pedir implementación).

## Prioridad bajo deadline

1. **P0** — Users + evento password + Firebase emulator + Jest ≥ 80 % + CI  
2. **P1** — Nx lite + Terraform lite (ya especificados; no deben tumbar el P0)

## Próximos pasos

1. Inicializar git + remote GitHub (si aún no existe).
2. Crear Issues/Project desde las US del doc de requisitos.
3. Implementar: en Cursor, `/opsx:apply bootstrap-users-api`.
