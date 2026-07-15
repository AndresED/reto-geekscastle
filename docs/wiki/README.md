# Wiki — Users API (GeeksCastle)

Aquí está la explicación “en humano” de cómo está armada la API y cómo trabajar en el repo día a día.

No reemplaza a los [ADRs](../adr/) (ahí viven las decisiones cortas y obligatorias) ni al [README](../../README.md) (ahí está el arranque).

## Por dónde empezar

| # | Documento | Sirve si… |
|---|-----------|-----------|
| 1 | [Camino del desarrollador](./camino-del-desarrollador.md) | Acabas de llegar o vas a tocar código mañana |
| 2 | [Arquitectura (hexagonal + CQRS)](./arquitectura.md) | Quieres entender por qué hay tantas carpetas |
| 3 | [Toma de decisiones](./toma-de-decisiones.md) | No sabes cuándo abrir un ADR o un OpenSpec |
| 4 | [Futuro Pub/Sub](./futuro-pubsub.md) | Quieres ver cómo sacar los eventos de Nest sin romper el `201` |

## Qué no encontrarás aquí

- El contrato HTTP completo → Swagger en `/api/docs` y las historias en [`requirements/reto.md`](../requirements/reto.md).
- Actas de code review → [`docs/reviews/`](../reviews/).
- Si la wiki y un **ADR aceptado** no coinciden, manda el ADR. Después actualizamos la wiki.

## Vista de pájaro

```text
HTTP (controller)  →  CommandBus / QueryBus  →  Handler  →  Ports  →  Adapters (Firestore, bcrypt…)
                                                              │
                                                    evento de dominio (aviso)
                                                              ▼
                                                 audit (log, hoy)
                                                 Pub/Sub (mañana, misma idea)
```

Datos y diagramas C4: [`docs/infra/`](../infra/README.md).  
Por qué el password no se genera en el `@EventsHandler`: [`finalize-await-vs-events-handler.md`](../architecture/finalize-await-vs-events-handler.md).
