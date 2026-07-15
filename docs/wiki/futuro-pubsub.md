# Futuro: Pub/Sub (sin romper lo que ya funciona)

Hoy el aviso “se creó un usuario” vive **dentro** del proceso Nest.  
En GCP, ese mismo aviso puede viajar por **Pub/Sub**. Aquí va la idea y el camino seguro.

Despliegue soñado: [README — Cómo lo desplegaría en GCP](../../README.md#cómo-lo-desplegaría-en-gcp).

---

## 1. Megáfono en la cocina vs carta al correo

| Hoy (local / Nest) | Mañana (GCP) |
|--------------------|--------------|
| El cocinero grita: “mesa lista” (`EventBus`) | Manda una **carta** a otra sucursal (`Pub/Sub` + Function o worker) |
| Quien oye está en el mismo local (`UserCreatedAuditHandler`) | Quien oye puede estar en otro servicio (logs, correo, métricas) |
| Si nadie oye el grito, el aviso se pierde | La carta se **reintenta**; quien la lea debe poder procesarla **más de una vez** sin romper nada |

En los dos casos el mensaje dice **“pasó X”**, no **“vuelve a cocinar el plato fuerte”**.

El plato fuerte (crear usuario + password) se termina **antes** de avisar.

---

## 2. Lo que el consumidor de Pub/Sub no debe hacer

```text
❌ Regenerar el password
❌ Volver a hashear “por si acaso”
❌ Borrar y recrear al usuario
❌ Creerse el único que escribe passwordHash
```

Eso vuelve a meter ciclos y choca con el [ADR-0002](../adr/0002-backend-hexagonal-cqrs.md) y el doc de finalize.

**Sí puede:**

- Dejar audit log, métrica o un registro en BigQuery.
- Mandar un correo de bienvenida (sin filtrar password en claro: hoy **no** devolvemos el password plano).
- Disparar otro flujo (rol, índice de búsqueda) **si** tolera repetirse.

---

## 3. Secuencia que queremos en producción

```text
1. Transacción en Firestore (emails/{email} + users/{id})
2. await FinalizeMissingPasswordService   ← único que escribe el password
3. Responder 201 al cliente
4. Publicar user.created en Pub/Sub        ← cuando el estado ya está listo
5. Worker / Cloud Function consume (puede llegar N veces) → solo efectos “de observación”
```

Piensa en el **boleto del cine**: primero te confirman la butaca; **después** mandas el push de “disfruta la peli”. Si el push llega dos veces, no te cambian de asiento.

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
| `version` | Poder evolucionar sin romper consumidores viejos |
| `userId` | Clave para no procesar dos veces lo mismo |
| `passwordWasMissing` | Telemetría o texto del correo; **no** para volver a generar password |

Guarda “ya procesé este `messageId`” (o `userId` + tipo + ventana) en Firestore o Redis. Un reenvío de Pub/Sub no debería spamear correos si el producto no lo quiere.

---

## 5. Encaje con hexagonal

No tiramos la arquitectura por la ventana:

| Pieza | Rol futuro |
|-------|------------|
| Puerto tipo `DomainEventPublisher` | La aplicación publica `UserCreated` sin saber de Pub/Sub |
| Adaptador `PubSubUserCreatedPublisher` | Infra: topic de GCP |
| Adaptador Nest (EventBus) | Local y demos |
| Handler de auditoría en Nest | Prototipo; en prod se apaga o convive un rato |

La aplicación sigue ordenando el baile. La infraestructura habla con Google.

---

## 6. Pasos razonables (en ese orden)

1. **Dejar quieto el contrato actual:** finalize con await + audit que solo loguea (ya está).
2. **Sacar un puerto de publicación** detrás del create (mismo contenido de mensaje).
3. **Adaptador Pub/Sub** detrás de una variable (`EVENT_BUS=nest|pubsub`).
4. **Worker idempotente** (Cloud Function o un Cloud Run chico).
5. Apagar los efectos dentro del proceso Nest cuando el worker sea estable.
6. (Opcional) **Outbox** en Firestore si necesitas “al menos una vez” en la misma transacción del create.

El paso 6 no es del día uno: es complejidad que el reto no pide implementar.

---

## 7. Relación con Cloud Run

```text
Internet → Cloud Run (API Nest) → Firestore
                     │
                     └─► Pub/Sub → Function / worker
```

- Meter **todo** Nest en una Cloud Function suele salir caro (cold start y otro modelo de ejecución).
- Una Function **sí** encaja bien como oyente liviano del topic.

El detalle operativo está en el README raíz, sección GCP.

---

## 8. Antes de “prender” Pub/Sub

- [ ] El `201` sigue saliendo **después** del finalize.
- [ ] No se publica si create o finalize fallaron.
- [ ] El consumidor no escribe `passwordHash`.
- [ ] Hay plan para reintentos y mensajes envenenados (DLQ).
- [ ] IAM mínimo: la API publica; el worker suscribe.
- [ ] Hay un test de contrato del mensaje (versión del schema).

Volver a: [arquitectura](./arquitectura.md) · [camino del desarrollador](./camino-del-desarrollador.md).
