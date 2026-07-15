# Futuro: Pub/Sub (sin romper lo que ya funciona)

Hoy el aviso “se creó un usuario” vive **dentro** del proceso Nest.  
En GCP, ese mismo aviso puede viajar por **Pub/Sub**. Aquí está la idea y el camino seguro.

Cómo lo desplegaría: [README — sección GCP](../../README.md#cómo-lo-desplegaría-en-gcp).

---

## 1. Megáfono en la cocina frente a una carta por correo

| Hoy (local / Nest) | Mañana (GCP) |
|--------------------|--------------|
| El cocinero grita: “mesa lista” (`EventBus`) | Manda una **carta** a otra sucursal (`Pub/Sub` + Function o worker) |
| Quien oye está en el mismo local (`UserCreatedAuditHandler`) | Quien oye puede estar en otro servicio (logs, correo, métricas) |
| Si nadie oye el grito, el aviso se pierde | La carta se **reintenta**; quien la lea debe poder procesarla **más de una vez** sin romper nada |

En ambos casos el mensaje dice **“pasó X”**, no **“vuelve a hacer el trabajo principal”**.

El trabajo principal (crear usuario + password) termina **antes** de avisar.

---

## 2. Lo que el consumidor de Pub/Sub no debe hacer

```text
❌ Regenerar el password
❌ Volver a hashear “por si acaso”
❌ Borrar y recrear al usuario
❌ Creerse el único que escribe passwordHash
```

Eso reintroduce ciclos y contradice el [ADR-0002](../adr/0002-backend-hexagonal-cqrs.md) y el documento de finalize.

**Sí puede:**

- Escribir un log de auditoría, una métrica o un registro en BigQuery.
- Enviar un correo de bienvenida (sin filtrar el password en claro: hoy **no** devolvemos el password plano).
- Disparar otro flujo (asignar rol, índice de búsqueda) **si** tolera ejecutarse más de una vez.

---

## 3. Secuencia que queremos en producción

```text
1. Transacción en Firestore (emails/{email} + users/{id})
2. await FinalizeMissingPasswordService   ← único que escribe el password
3. Responder 201 al cliente
4. Publicar user.created en Pub/Sub        ← cuando el estado ya está listo
5. Worker / Cloud Function consume (puede llegar N veces) → solo efectos secundarios de observación
```

Piensa en el **boleto del cine**: primero te confirman la butaca; **después** mandas la notificación de “disfruta la película”. Si la notificación llega dos veces, no te cambian de asiento.

---

## 4. Mensaje (borrador)

Algo mínimo, alineado con el evento de dominio de hoy:

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

## 5. Cómo encaja con hexagonal

No tiramos la arquitectura por la ventana:

| Pieza | Rol futuro |
|-------|------------|
| Puerto tipo `DomainEventPublisher` | La aplicación publica `UserCreated` sin saber de Pub/Sub |
| Adaptador `PubSubUserCreatedPublisher` | Infraestructura: topic de GCP |
| Adaptador Nest (EventBus) | Local y demos |
| Handler de auditoría en Nest | Prototipo; en producción se apaga o convive un tiempo |

La aplicación sigue orquestando. La infraestructura habla con Google.

---

## 6. Pasos razonables (en ese orden)

1. **Mantener estable el contrato actual:** finalize con await + auditoría que solo escribe log (ya está).
2. **Extraer un puerto de publicación** detrás del create (mismo contenido de mensaje).
3. **Adaptador Pub/Sub** detrás de una variable (`EVENT_BUS=nest|pubsub`).
4. **Worker idempotente** (Cloud Function o un Cloud Run pequeño).
5. Apagar los efectos dentro del proceso Nest cuando el worker sea estable.
6. (Opcional) **Outbox** en Firestore si necesitas “al menos una vez” en la misma transacción del create.

El paso 6 no es del primer día: es complejidad que el reto no pide implementar.

---

## 7. Relación con Cloud Run

```text
Internet → Cloud Run (API Nest) → Firestore
                     │
                     └─► Pub/Sub → Function / worker
```

- Meter **todo** Nest en una Cloud Function suele salir caro (arranque en frío y otro modelo de ejecución).
- Una Function **sí** encaja bien como consumidor ligero del topic.

El detalle operativo está en el README raíz, sección GCP.

---

## 8. Antes de activar Pub/Sub

- [ ] El `201` sigue saliendo **después** del finalize.
- [ ] No se publica si create o finalize fallaron.
- [ ] El consumidor no escribe `passwordHash`.
- [ ] Hay plan para reintentos y mensajes que fallan siempre (DLQ).
- [ ] IAM mínimo: la API publica; el worker suscribe.
- [ ] Hay un test de contrato del mensaje (versión del schema).

Volver a: [arquitectura](./arquitectura.md) · [camino del desarrollador](./camino-del-desarrollador.md).
