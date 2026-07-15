# Wiki — Users API

Esto es la guía “en humano” del repo: cómo está armada la API y cómo trabajar sin adivinar.

No reemplaza a los [ADRs](../adr/) (ahí están las decisiones que mandan) ni al [README](../../README.md) (ahí está cómo levantarla).

## Leer en este orden

| # | Documento | Cuando te sirve |
|---|-----------|-----------------|
| 1 | [Camino del desarrollador](./camino-del-desarrollador.md) | Acabas de llegar o vas a tocar código mañana |
| 2 | [Arquitectura](./arquitectura.md) | Quieres entender el porqué de tantas carpetas |
| 3 | [Toma de decisiones](./toma-de-decisiones.md) | No sabes si abrir un ADR o un OpenSpec |
| 4 | [Futuro Pub/Sub](./futuro-pubsub.md) | Quieres ver cómo sacar los avisos a la nube |

## Qué no busques aquí

- El contrato HTTP al milímetro → Swagger (`/api/docs`) o las historias en [`reto.md`](../requirements/reto.md).
- Actas de review → [`docs/reviews/`](../reviews/).
- Si choca con un **ADR aceptado**, manda el ADR y corregimos la wiki.

## Panorama en una mirada

```text
HTTP (controller)  →  CommandBus / QueryBus  →  Handler  →  Puertos  →  Adaptadores
                                                              │
                                                         aviso de dominio
                                                              ▼
                                                    audit (hoy) · Pub/Sub (mañana)
```

Datos y C4: [`docs/infra/`](../infra/README.md).  
Por qué el password no se arma en el `@EventsHandler`: [ese doc](../architecture/finalize-await-vs-events-handler.md).
