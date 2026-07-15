# Toma de decisiones

Cómo decidimos si cambiamos algo, dónde lo dejamos escrito y con cuánta formalidad — sin inventar rituales de más.

---

## 1. Distintos papeles, distinta “papeleta”

| Artefacto | Se parece a… | Úsalo cuando… |
|-----------|--------------|---------------|
| **ADR** (`docs/adr/`) | Un permiso de obra firmado | La decisión estructural tiene que sobrevivir al autor |
| **OpenSpec** (`openspec/`) | El plano de la reforma + la lista de tareas | El cambio tiene criterios que se pueden comprobar |
| **Wiki** (`docs/wiki/`) | La guía para quien llega al barrio | Quieres explicar el “por qué” con calma |
| **Review** (`docs/reviews/`) | Un informe de inspección | Quieres una foto de calidad en un momento dado |

Si el cambio es estructural y solo queda en código (o solo en la wiki), mañana nadie sabe si fue accidente o decisión.

---

## 2. De lo liviano a lo pesado

```text
¿Es un typo, un comentario o un test obvio que faltaba?
        │
        ▼ sí → PR chico, sin OpenSpec

¿Cambia lo que ve el cliente o una regla / seguridad?
        │
        ▼ sí → OpenSpec (propose → apply → archive)
              y actualiza README / Swagger si hace falta

¿Cambia cómo armamos el sistema (stack, patrón, límites de capa)?
        │
        ▼ sí → ADR nuevo o enmienda + alinear la wiki
```

### Decisiones que ya tomamos aquí

| Decisión | Dónde quedó | Motivo breve |
|----------|-------------|--------------|
| Hexagonal + CQRS + un archivo por handler | ADR-0002 | Es la regla para cualquier feature de `users` |
| Password con `await`, no en el `@EventsHandler` | ADR-0002 + doc de architecture | El contrato HTTP + cómo se comporta el EventBus de Nest |
| Firestore + emulador | ADR-0003 | Persistencia del reto |
| Throttle 20/min en `/users`; `/health` libre | ADR-0005 + specs de delivery | API sin auth = superficie fácil de abusar |
| Listado como máximo 100 filas | OpenSpec `cap-list-users-page-size` | Coste / abuso del listado |
| Cloud Run + Pub/Sub “después” | README (GCP) + esta wiki | Roadmap; todavía no hay código |

---

## 3. Principios que acortan la discusión

1. **No inventes lo que no hace falta.** No partimos el módulo en microservicios. Sí separamos capas: lo pide el reto y el equipo.
2. **Manda el contrato HTTP.** Si el cliente recibe `201`, el estado de negocio ya tiene que estar listo (password hecho, no “en camino”).
3. **La infra no se cuela en el dominio.** Preferimos un puerto torpe a un `import` de Firebase en application.
4. **Lo diferido tiene que poder repetirse.** Finalize y, más adelante, los consumidores de Pub/Sub deben ser idempotentes.
5. **Un change, una preocupación.** No mezcles “listar usuarios” con “rediseñar auth” en el mismo OpenSpec.

---

## 4. Cómo plantear un intercambio (plantilla corta)

En el PR o en el chat:

1. **Problema** — qué duele hoy.
2. **Opciones** — al menos dos (incluida “no hacer nada”).
3. **Criterio** — corrección, deadline, qué tan testeable es, coste operativo.
4. **Elección** — una frase.
5. **Consecuencia** — qué deuda queda (comentario `ponytail:` o ticket).

Ejemplo de lo que ya vivimos:

> Problema: `EventBus.publish` de Nest no espera a los handlers → un `201` puede mentir.  
> Opciones: (A) mutar en el EventsHandler, (B) await de un application service, (C) outbox + worker.  
> Criterio: contrato HTTP + fecha del reto.  
> Elección: B ahora; C es el camino hacia Pub/Sub.  
> Consecuencia: el “evento” del PDF es un aviso de dominio, no quien genera el password.

---

## 5. OpenSpec, sin misterio

OpenSpec es el **guion antes de filmar**:

1. `propose` — qué cambia y qué specs se mueven.
2. `apply` — implementas contra la lista de tareas.
3. `archive` — el cambio pasa al historial / specs vivas.

No lo abras para corregir un ejemplo de `curl`. Sí para algo como “añadir listado con tope de filas”.

---

## 6. Si decides X, también actualiza Y

| Si cambias… | Revisa también… |
|-------------|-----------------|
| Capas, puertos o el flujo de create | ADR-0002, wiki de arquitectura, C4 si aplica |
| Seguridad (throttle, hashing) | ADR-0005, README, descripción en Swagger |
| Colecciones de Firestore | `docs/infra/base-de-datos.md` |
| Plan en la nube | README (GCP) + [futuro-pubsub](./futuro-pubsub.md) |
| Cómo entra alguien nuevo | [camino-del-desarrollador](./camino-del-desarrollador.md) |

Siguiente: [futuro Pub/Sub](./futuro-pubsub.md).
