# Documentación — Reto GeeksCastle

Aquí viven la wiki, los ADR, los requisitos y los diagramas.  
Si acabas de aterrizar, empieza por el [README de la raíz](../README.md) para levantar la API; vuelve acá cuando quieras el “por qué”.

---

## Si estás revisando la entrega

Orden que te ahorra vueltas:

1. **[Wiki](./wiki/README.md)** — explicación clara (analogías, onboarding, decisiones, Pub/Sub).
2. **[ADRs](./adr/)** — decisiones cortas que mandan el diseño.
3. README raíz — setup, curls, panorama GCP.
4. Swagger (`/api/docs`) — contrato HTTP con la API arriba.
5. [Historias US](./requirements/reto.md) — criterios US-01…US-22.

**Wiki, primeros tres pasos:** [camino del desarrollador](./wiki/camino-del-desarrollador.md) → [arquitectura](./wiki/arquitectura.md) → [toma de decisiones](./wiki/toma-de-decisiones.md).

**ADR estrella:** [0002 — Hexagonal + CQRS](./adr/0002-backend-hexagonal-cqrs.md).

Si wiki y ADR no coinciden, **gana el ADR**.

---

## Si vas a tocar código

- Arranque y curls: [README raíz](../README.md)
- Cómo sumar un feature sin romper capas: [wiki → camino del desarrollador](./wiki/camino-del-desarrollador.md)
- Password / evento: [finalize await vs EventsHandler](./architecture/finalize-await-vs-events-handler.md)
- Datos y diagramas: [docs/infra/](./infra/README.md)
- Specs: carpeta `openspec/` en la raíz

---

## ADRs (mapa rápido)

| ADR | Tema |
|-----|------|
| [0001](./adr/0001-estructura-proyecto-nestjs.md) | Estructura Nest / repo |
| [0002](./adr/0002-backend-hexagonal-cqrs.md) | Hexagonal + CQRS + finalize vs evento |
| [0003](./adr/0003-firebase-firestore-emulator.md) | Firestore + emulator |
| [0004](./adr/0004-ci-github-actions.md) | CI |
| [0005](./adr/0005-seguridad-passwords-y-api.md) | Passwords, Helmet, throttle |
| [0006](./adr/0006-nx-workspace-lite.md) | Nx lite |
| [0007](./adr/0007-terraform-firebase-lite.md) | Terraform lite |

Terraform en código: [`infra/README.md`](../infra/README.md) (raíz del repo).

---

## Qué hay en `docs/`

```
docs/
├── README.md          ← estás acá
├── wiki/              ← guía en tono humano
├── adr/               ← decisiones vinculantes
├── architecture/      ← diseño profundo del password/evento
├── infra/             ← Firestore + C4
├── requirements/      ← historias US
└── reviews/           ← code reviews internos
```

---

## Project board

Estados típicos: `Backlog` → `Ready` → `In Progress` → `In Review` → `Done`.

Una historia = un Issue `US-XX — …` con los criterios de `reto.md`.  
Si usas OpenSpec, mueve la tarjeta y cierra el Issue al archivar el change.
