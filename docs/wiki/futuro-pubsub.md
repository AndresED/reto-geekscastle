# Futuro: Pub/Sub (sin romper lo que ya funciona)

Hoy el aviso “se creó un usuario” vive **dentro** de Nest.  
En GCP ese mismo aviso puede viajar por **Pub/Sub**. Aquí va la idea y cómo hacerlo sin romper el contrato del `201`.

Cómo lo desplegaría en la nube: [README — sección GCP](../../README.md#10-cómo-lo-desplegaría-en-gcp-solo-diseño).

---

## 1. Aviso en la misma app frente a mensaje a otro servicio

| Hoy (local / Nest) | Mañana (GCP) |
|--------------------|--------------|
| El aviso se queda en el mismo proceso (`EventBus`) | Se envía un mensaje a otro servicio (Pub/Sub + Function o worker) |
| Quien reacciona está en la misma API (handler de auditoría) | Puede ser otro proceso (logs, correo, métricas) |
| Si nadie lo escucha, se pierde | El mensaje se **reintenta**; hay que poder procesarlo **más de una vez** sin romper nada |

En los dos casos el mensaje dice **“esto ya pasó”**, no **“vuelve a crear el usuario o el password”**.

Crear el usuario (y el password, si faltaba) se termina **antes** de avisar.

---

## 2. Lo que quien consume el mensaje no debe hacer

```text
❌ Regenerar el password
❌ Volver a hashear “por si acaso”
❌ Borrar y recrear al usuario
❌ Asumir que es el único que escribe passwordHash
```

Eso vuelve a meter ciclos y contradice el [ADR-0002](../adr/0002-backend-hexagonal-cqrs.md).

**Sí puede:**

- Escribir un log de auditoría, una métrica o un registro en BigQuery.
- Enviar un correo de bienvenida (sin mandar el password en claro: hoy **no** lo devolvemos).
- Disparar otro flujo (asignar rol, indexar búsqueda) **si** tolera ejecutarse más de una vez.

---

## 3. Orden que queremos en producción

```text
1. Transacción en Firestore (emails + users)
2. await FinalizeMissingPasswordService   ← único que escribe el password
3. Responder 201 al cliente
4. Publicar user.created en Pub/Sub
5. El worker / Function consume (puede llegar varias veces) → solo notificar u observar
```

Como en el cine: primero te confirman la butaca; **después** llega el aviso de “disfruta la película”. Si el aviso llega dos veces, no te cambian de asiento.

---

## 4. Mensaje (borrador)

Algo mínimo, alineado al evento de dominio de hoy:

```json
{
  "type": "user.created",
  "version": 1,
  "userId": "…",
  "passwordWasMissing": true,
  "occurredAt": "2026-07-15T18:00:00.000Z"
}
```

| Campo | Para qué |
|-------|----------|
| `version` | Poder cambiar el formato sin romper consumidores viejos |
| `userId` | Evitar procesar dos veces el mismo alta |
| `passwordWasMissing` | Dato para métricas o texto del correo; **nunca** para regenerar el password |

Guarda “ya procesé este mensaje” (por `messageId` o por `userId` + tipo) en Firestore o Redis. Un reenvío de Pub/Sub no debería mandar el mismo correo una y otra vez.

---

## 5. Cómo encaja con hexagonal

No hace falta tirar la arquitectura:

| Pieza | Rol |
|-------|-----|
| Puerto de publicación (ej. `DomainEventPublisher`) | La aplicación avisa sin saber si es Nest o Pub/Sub |
| Adaptador Pub/Sub | Infraestructura habla con GCP |
| Adaptador Nest (EventBus) | Local y demos |
| Handler de auditoría actual | Prototipo; en producción se apaga o convive un tiempo |

La aplicación sigue ordenando el flujo. La infraestructura es quien habla con Google.

---

## 6. Pasos recomendados (en ese orden)

1. **Mantener el contrato actual** — finalize con `await` + auditoría que solo escribe log (ya está).
2. **Extraer un puerto de publicación** detrás del create (mismo contenido de mensaje).
3. **Adaptador Pub/Sub** controlado por variable (`EVENT_BUS=nest|pubsub`).
4. **Worker que tolere mensajes repetidos** (Cloud Function o un Cloud Run pequeño).
5. Apagar los efectos dentro del proceso Nest cuando el worker esté estable.
6. (Opcional) **Outbox** en Firestore si necesitas publicar en la misma transacción del create.

El paso 6 no es del primer día: es complejidad que el reto no pide implementar.

---

## 7. Relación con Cloud Run

```text
Internet → Cloud Run (API Nest) → Firestore
                     │
                     └─► Pub/Sub → Function / worker
```

- Meter **todo** Nest en una Cloud Function suele salir caro (arranque en frío y otro modelo de ejecución).
- Una Function **sí** sirve como consumidor pequeño del topic.

El detalle operativo está en el README raíz, sección GCP.

---

## 8. Antes de activar Pub/Sub

- [ ] El `201` sigue saliendo **después** del finalize.
- [ ] No se publica si create o finalize fallaron.
- [ ] Quien consume no escribe `passwordHash`.
- [ ] Hay plan para reintentos y mensajes que fallan siempre (cola de muertos / DLQ).
- [ ] Permisos mínimos: la API publica; el worker solo suscribe.
- [ ] Hay una prueba de que el mensaje tiene la forma acordada (versión del schema).

Volver a: [arquitectura](./arquitectura.md) · [camino del desarrollador](./camino-del-desarrollador.md).
