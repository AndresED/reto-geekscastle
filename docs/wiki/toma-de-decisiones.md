# Toma de decisiones

Cómo elegimos un cambio y dónde lo dejamos escrito, sin alargar de más el proceso.

---

## 1. Qué documento usamos para qué

| Documento | Para qué sirve | Cuándo lo usas |
|-----------|----------------|----------------|
| **ADR** | Deja la decisión por escrito para no discutirla en cada PR | Tiene que quedar clara aunque cambie el equipo |
| **OpenSpec** | Plan del cambio y tareas que se pueden revisar | El cambio tiene criterios claros de “listo” |
| **Wiki** | Explica el porqué con calma | Alguien nuevo o el evaluador necesita contexto |
| **Review** | Resume cómo estaba el código en ese momento | Quieres dejar constancia de una revisión |

Si el cambio es grande y solo queda en el código (o solo en la wiki), mañana nadie sabe si fue accidente o decisión.

---

## 2. Según el tamaño del cambio

```text
¿Es un error de texto, un comentario o un test que claramente faltaba?
        → Pull request pequeño, sin OpenSpec

¿Cambia lo que ve el cliente, una regla de negocio o algo de seguridad?
        → OpenSpec (propose → apply → archive)
          y actualiza README / Swagger si hace falta

¿Cambia la forma de construir el sistema (stack, patrón, límites entre capas)?
        → ADR nuevo o actualización del ADR, y actualiza la wiki
```

### Decisiones que ya tomamos en este proyecto

| Decisión | Dónde quedó | Motivo |
|----------|-------------|--------|
| Hexagonal + CQRS + un archivo por handler | ADR-0002 | Así trabajamos el módulo `users` |
| Password con `await`, no en el EventsHandler | ADR-0002 + doc de architecture | Un `201` no puede decir que hay password si aún no está; el EventBus de Nest no espera |
| Firestore + emulador | ADR-0003 | Así guarda datos el reto en local |
| Límite de 20 req/min en `/users` | ADR-0005 | La API no tiene login: es fácil abusarla |
| Listado de a lo sumo 100 filas | OpenSpec del tope de listado | Evitar un `GET` muy pesado o abuso del listado |
| Cloud Run + Pub/Sub “más adelante” | README + wiki | Plan a futuro; todavía no hay código |

---

## 3. Acuerdos que evitan dar vueltas

1. **No inventes de más.** No partimos el módulo en microservicios; sí separamos capas (lo pide el reto y el equipo).
2. **Si respondes `201`, el trabajo ya terminó.** El password (si faltaba) tiene que estar guardado; no “en camino”.
3. **Firebase no se mete en el dominio.** Preferimos una interfaz imperfecta a un `import` de Firebase en application.
4. **Lo que corre “después” tiene que tolerar repetirse.** Finalize y, más adelante, quien consuma Pub/Sub no deben romper si el mensaje llega dos veces.
5. **Un OpenSpec = un tema.** No mezcles “listar usuarios” con “rediseñar el login” en el mismo change.

---

## 4. Cómo proponer un cambio

Cuando lo comentes en el pull request o en el chat, conviene cubrir esto:

1. **Problema** — qué está mal o qué falta.
2. **Opciones** — al menos dos caminos (incluida “dejarlo como está”).
3. **Criterios** — qué pesa más: que sea correcto, la fecha límite, qué tan fácil es probarlo y el costo de mantenerlo.
4. **Elección** — en una frase, qué camino tomamos.
5. **Pendientes** — si queda algo a propósito (comentario en código o un ticket).

Ejemplo de lo que ya vivimos:

> Problema: `publish` no espera a los handlers → el `201` puede decir que el password está listo cuando aún no.  
> Opciones: escribir el password en el EventsHandler / hacer `await` de un servicio / outbox + worker.  
> Criterios: contrato HTTP + fecha del reto.  
> Elección: `await` ahora; Pub/Sub después.  
> Pendiente: el “evento” del PDF es un aviso, no quien genera el password.

---

## 5. OpenSpec, en corto

Sirve para acordar el cambio **antes** de implementarlo sin alcance claro:

1. `propose` — qué cambia.
2. `apply` — lo implementas siguiendo la lista de tareas.
3. `archive` — queda en el historial.

No lo abras solo para corregir un ejemplo de `curl`. Sí para algo como “listado con tope de filas”.

---

## 6. Si cambias una cosa, revisa la otra

| Si cambias… | Revisa también… |
|-------------|-----------------|
| Capas o el create | ADR-0002, wiki de arquitectura, C4 |
| Seguridad | ADR-0005, README, Swagger |
| Colecciones de Firestore | `docs/infra/base-de-datos.md` |
| Plan en la nube | README (GCP) + [futuro-pubsub](./futuro-pubsub.md) |
| Cómo entra alguien nuevo | [camino del desarrollador](./camino-del-desarrollador.md) |

Siguiente: [futuro Pub/Sub](./futuro-pubsub.md).
