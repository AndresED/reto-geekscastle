# Documentación — Reto GeeksCastle (Users API)

## Por audiencia

### Evaluador

1. [README raíz](../README.md) — setup, arquitectura, curls, tests y cómo lo desplegaría en GCP
2. **OpenAPI** — con la API arriba: [http://localhost:3000/api/docs](http://localhost:3000/api/docs) (schemas + respuestas 201/400/404/409/429)
3. [Requisitos e historias US-01 – US-22](./requirements/reto.md) — **deadline: 2026-07-16 12:00 CDMX**
4. [Infra producto (Firestore + C4)](./infra/README.md) — modelo `users`/`emails`, flujos
5. [ADRs](./adr/) — decisiones vinculantes (incl. Nx + Terraform lite)
6. Terraform: [`infra/README.md`](../infra/README.md) (raíz del repo)
7. Enunciado e historias: [`requirements/reto.md`](./requirements/reto.md) (PDF local: `Challenge -Desarrollador Backend 2026.pdf`, no versionado)

### Desarrollador

- Historias detalladas (copiar a GitHub Issues): [`requirements/reto.md`](./requirements/reto.md)
- ADRs antes de implementar features transversales
- Infra de producto: [`docs/infra/`](./infra/README.md)
- OpenSpec: carpeta `openspec/`

---

## Decisiones de arquitectura (ADR)

| ADR | Tema |
|-----|------|
| [0001](./adr/0001-estructura-proyecto-nestjs.md) | Estructura NestJS / repo (enmienda Nx) |
| [0002](./adr/0002-backend-hexagonal-cqrs.md) | Hexagonal + CQRS + evento UserCreated |
| [0003](./adr/0003-firebase-firestore-emulator.md) | Firestore Admin SDK + emulator |
| [0004](./adr/0004-ci-github-actions.md) | CI build + test:cov ≥ 80 % |
| [0005](./adr/0005-seguridad-passwords-y-api.md) | Passwords, validación, límites |
| [0006](./adr/0006-nx-workspace-lite.md) | Nx workspace lite (`apps/api`) |
| [0007](./adr/0007-terraform-firebase-lite.md) | Terraform lite Firebase |

---

## Estructura de `docs/`

```
docs/
├── README.md              ← estás acá
├── requirements/reto.md   ← historias US + mapa
├── adr/                   ← ADR-0001 … 0007
├── infra/                 ← Firestore model + C4 (este reto)
└── reviews/               ← code reviews
```

---

## GitHub Projects (operación)

Estados recomendados: `Backlog` → `Ready` → `In Progress` → `In Review` → `Done`.

Una historia = un Issue con título `US-XX — …` y body = criterios de aceptación del doc de requisitos.  
Al implementar con OpenSpec, mover la tarjeta y cerrar el Issue al archivar el change.
