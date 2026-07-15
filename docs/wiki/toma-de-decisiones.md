# Toma de decisiones

Cómo decidimos si cambiamos algo, dónde lo dejamos por escrito y cuánta formalidad usa cada tipo de cambio — sin inventar ceremonias de más.

---

## 1. Qué documento usamos para qué

| Artefacto | Se parece a… | Úsalo cuando… |
|-----------|--------------|---------------|
| **ADR** (`docs/adr/`) | Un permiso de obra firmado | La decisión estructural debe sobrevivir a quien la tomó |
| **OpenSpec** (`openspec/`) | El plano de la reforma + la lista de tareas | El cambio tiene criterios que se pueden comprobar |
| **Wiki** (`docs/wiki/`) | La guía para quien llega nuevo | Quieres explicar el “por qué” con calma |
| **Review** (`docs/reviews/`) | Un informe de inspección | Quieres dejar una foto del estado del código en un momento |

Si el cambio es estructural y solo queda en el código (o solo en la wiki), mañana nadie sabrá si fue accidente o decisión.

---

## 2. Cuánta formalidad según el cambio

```text
¿Es un typo, un comentario o un test obvio que faltaba?
        │
        ▼ sí → pull request pequeño, sin OpenSpec

¿Cambia lo que ve el cliente, una regla de negocio o algo de seguridad?
        │
        ▼ sí → OpenSpec (propose → apply → archive)
              y actualiza README / Swagger si hace falta

¿Cambia cómo construimos el sistema (stack, patrón, límites entre capas)?
        │
        ▼ sí → ADR nuevo o enmienda + actualizar la wiki
```

### Decisiones que ya tomamos en este proyecto

| Decisión | Dónde quedó | Motivo breve |
|----------|-------------|--------------|
| Hexagonal + CQRS + un archivo por handler | ADR-0002 | Es la regla para cualquier feature de `users` |
| Password con `await`, no en el `@EventsHandler` | ADR-0002 + doc de architecture | Contrato HTTP + comportamiento del EventBus de Nest |
| Firestore + emulador | ADR-0003 | Persistencia del reto |
| Throttle 20/min en `/users`; `/health` fuera | ADR-0005 + specs de delivery | API sin autenticación: fácil de abusar |
| Listado con máximo 100 filas | OpenSpec `cap-list-users-page-size` | Coste y abuso del listado |
| Cloud Run + Pub/Sub “más adelante” | README (GCP) + esta wiki | Roadmap; todavía no hay código |

---

## 3. Principios que acortan la discusión

1. **No inventes lo que no hace falta.** No partimos el módulo en microservicios. Sí separamos capas: lo pide el reto y el equipo.
2. **El contrato HTTP manda.** Si el cliente recibe `201`, el estado de negocio ya tiene que estar listo (password hecho, no “en camino”).
3. **La infraestructura no se cuela en el dominio.** Preferimos un puerto imperfecto a un `import` de Firebase en application.
4. **Lo diferido tiene que poder repetirse.** Finalize y, más adelante, los consumidores de Pub/Sub deben ser idempotentes.
5. **Un OpenSpec, un tema.** No mezcles “listar usuarios” con “rediseñar autenticación” en el mismo change.

---

## 4. Cómo plantear una decisión (plantilla corta)

En el pull request o en el chat:

1. **Problema** — qué duele hoy.
2. **Opciones** — al menos dos (incluida “no hacer nada”).
3. **Criterio** — corrección, fecha límite, facilidad de testear, coste operativo.
4. **Elección** — una frase.
5. **Consecuencia** — qué deuda queda (comentario `ponytail:` o ticket).

Ejemplo de lo que ya vivimos:

> Problema: `EventBus.publish` de Nest no espera a los handlers → un `201` puede mentir.  
> Opciones: (A) mutar en el EventsHandler, (B) await de un servicio de application, (C) outbox + worker.  
> Criterio: contrato HTTP + fecha del reto.  
> Elección: B ahora; C es el camino hacia Pub/Sub.  
> Consecuencia: el “evento” del PDF es un aviso de dominio, no quien genera el password.

---

## 5. OpenSpec, en pocas palabras

OpenSpec es el **guion antes de filmar**:

1. `propose` — qué cambia y qué especificaciones se tocan.
2. `apply` — implementas contra la lista de tareas.
3. `archive` — el cambio queda en el historial / specs vivas.

No lo abras para corregir un ejemplo de `curl`. Sí para algo como “añadir listado con tope de filas”.

---

## 6. Si cambias X, revisa también Y

| Si cambias… | Revisa también… |
|-------------|-----------------|
| Capas, puertos o el flujo de create | ADR-0002, wiki de arquitectura, C4 si aplica |
| Seguridad (throttle, hashing) | ADR-0005, README, descripción en Swagger |
| Colecciones de Firestore | `docs/infra/base-de-datos.md` |
| Plan en la nube | README (GCP) + [futuro-pubsub](./futuro-pubsub.md) |
| Cómo entra alguien nuevo | [camino-del-desarrollador](./camino-del-desarrollador.md) |

Siguiente: [futuro Pub/Sub](./futuro-pubsub.md).
