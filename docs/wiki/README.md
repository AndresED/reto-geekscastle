# Wiki — Users API (GeeksCastle)

Documentación pensada para entender cómo está armada la API y cómo trabajar en el repositorio sin tener que adivinar.

No sustituye a los [ADRs](../adr/) (decisiones cortas y obligatorias) ni al [README](../../README.md) (cómo levantarla).

## Por dónde empezar

| # | Documento | Léelo si… |
|---|-----------|-----------|
| 1 | [Camino del desarrollador](./camino-del-desarrollador.md) | Acabas de llegar o vas a tocar código mañana |
| 2 | [Arquitectura (hexagonal + CQRS)](./arquitectura.md) | Quieres entender por qué hay tantas carpetas |
| 3 | [Toma de decisiones](./toma-de-decisiones.md) | No tienes claro cuándo escribir un ADR o abrir un OpenSpec |
| 4 | [Futuro Pub/Sub](./futuro-pubsub.md) | Quieres ver cómo sacar los eventos de Nest sin romper el `201` |

## Qué no encontrarás aquí

- El contrato HTTP completo: está en Swagger (`/api/docs`) y en las historias de [`requirements/reto.md`](../requirements/reto.md).
- Los reportes de code review: viven en [`docs/reviews/`](../reviews/).
- Si la wiki y un **ADR aceptado** se contradicen, manda el ADR. Luego corregimos la wiki.

## Visión general

```text
HTTP (controller)  →  CommandBus / QueryBus  →  Handler  →  Puertos  →  Adaptadores (Firestore, bcrypt…)
                                                              │
                                                    evento de dominio (aviso)
                                                              ▼
                                                 auditoría (log, hoy)
                                                 Pub/Sub (mañana, misma idea)
```

Modelo de datos y diagramas C4: [`docs/infra/`](../infra/README.md).  
Por qué el password no se genera en el `@EventsHandler`: [`finalize-await-vs-events-handler.md`](../architecture/finalize-await-vs-events-handler.md).
