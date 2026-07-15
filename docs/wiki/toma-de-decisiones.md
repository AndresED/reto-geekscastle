# Toma de decisiones

Cómo elegimos si cambiamos algo, dónde lo dejamos escrito y cuánta formalidad le ponemos — sin inventar rituales.

---

## 1. Qué papel juega cada cosa

| Artefacto | Se parece a… | Úsalo cuando… |
|-----------|--------------|---------------|
| **ADR** | Permiso de obra | La decisión tiene que sobrevivir a quien la tomó |
| **OpenSpec** | Plano + lista de tareas | El cambio se puede comprobar con criterios |
| **Wiki** | Guía para quien llega | Quieres explicar el porqué con calma |
| **Review** | Informe de inspección | Quieres una foto del código en un momento |

Si el cambio es gordo y solo queda en el código (o solo en la wiki), mañana nadie sabe si fue accidente o decisión.

---

## 2. Cuánta formalidad

```text
¿Typo, comentario o test obvio que faltaba?
        → PR chico, sin OpenSpec

¿Cambia lo que ve el cliente, una regla o seguridad?
        → OpenSpec (propose → apply → archive)
          + README / Swagger si hace falta

¿Cambia cómo armamos el sistema (stack, patrón, capas)?
        → ADR nuevo o enmienda + actualizar la wiki
```

### Cosas que ya decidimos aquí

| Decisión | Dónde | Por qué en corto |
|----------|--------|------------------|
| Hexagonal + CQRS + un archivo por handler | ADR-0002 | Regla del módulo `users` |
| Password con await, no en EventsHandler | ADR-0002 + doc architecture | Contrato HTTP + EventBus de Nest |
| Firestore + emulador | ADR-0003 | Persistencia del reto |
| Throttle 20/min en `/users` | ADR-0005 | API sin login: fácil de abusar |
| Listado máx. 100 | OpenSpec cap list | Coste / abuso |
| Cloud Run + Pub/Sub “después” | README + wiki | Roadmap, aún sin código |

---

## 3. Principios que cortan la discusión

1. **No inventes de más.** No partimos en microservicios; sí separamos capas (reto + equipo).
2. **El `201` manda.** Si responde OK, el estado de negocio ya está listo.
3. **La infra no se cuela al dominio.** Mejor un puerto torpe que un `import` de Firebase en application.
4. **Lo diferido se puede repetir.** Finalize y futuros consumidores Pub/Sub → idempotentes.
5. **Un OpenSpec, un tema.** No mezcles “listar” con “rediseñar auth”.

---

## 4. Plantilla para discutir

En el PR o el chat:

1. Problema — qué duele.
2. Opciones — al menos dos (incluida “no hacer nada”).
3. Criterio — corrección, fecha, facilidad de testear, coste.
4. Elección — una frase.
5. Consecuencia — qué deuda queda (`ponytail:` o ticket).

Ejemplo real:

> Problema: `publish` no espera a los handlers → el `201` puede mentir.  
> Opciones: mutar en EventsHandler / await de un servicio / outbox + worker.  
> Criterio: contrato HTTP + deadline.  
> Elección: await ahora; Pub/Sub después.  
> Consecuencia: el “evento” del PDF es aviso, no quien genera el password.

---

## 5. OpenSpec sin misterio

Es el **guion antes de filmar**:

1. `propose` — qué cambia.
2. `apply` — lo implementas.
3. `archive` — queda en el historial.

No lo abras por un curl de ejemplo. Sí para “listado con tope de filas”.

---

## 6. Si tocas X, mira también Y

| Cambias… | Revisa… |
|----------|---------|
| Capas / create | ADR-0002, wiki arquitectura, C4 |
| Seguridad | ADR-0005, README, Swagger |
| Colecciones | `docs/infra/base-de-datos.md` |
| Nube | README GCP + [futuro-pubsub](./futuro-pubsub.md) |
| Onboarding | [camino del desarrollador](./camino-del-desarrollador.md) |

Siguiente: [futuro Pub/Sub](./futuro-pubsub.md).
