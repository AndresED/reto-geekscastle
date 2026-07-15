# Futuro: Pub/Sub (sin romper lo que ya anda)

Hoy el aviso “se creó un usuario” vive **dentro** de Nest.  
En GCP ese mismo aviso puede ir por **Pub/Sub**. Acá va la idea y el camino seguro.

Cómo lo desplegaría: [README — GCP](../../README.md#10-cómo-lo-desplegaría-en-gcp-solo-diseño).

---

## 1. Megáfono en la cocina vs carta por correo

| Hoy | Mañana |
|-----|--------|
| Gritas en la cocina: “mesa lista” (`EventBus`) | Mandas una **carta** a otra sucursal (Pub/Sub + Function) |
| Quien oye está en el mismo local (audit handler) | Puede ser otro servicio (logs, mail, métricas) |
| Si nadie oye, se pierde | La carta se **reintenta**; hay que poder leerla **dos veces** sin romper nada |

El mensaje dice **“pasó X”**, no **“vuelve a cocinar el plato”**.

El plato (crear usuario + password) se termina **antes** de avisar.

---

## 2. Lo que el consumidor no debe hacer

```text
❌ Regenerar el password
❌ Hashear “por si acaso”
❌ Borrar y recrear al user
❌ Creerse dueño único de passwordHash
```

Eso te mete ciclos y choca con el [ADR-0002](../adr/0002-backend-hexagonal-cqrs.md).

**Sí puede:** log de auditoría, métrica, BigQuery, mail de bienvenida (sin filtrar password en claro — hoy **no** devolvemos el plano), otros flujos **si** toleran repetirse.

---

## 3. Orden en producción

```text
1. Transacción Firestore (emails + users)
2. await FinalizeMissingPasswordService   ← único que escribe el password
3. Responder 201
4. Publicar user.created en Pub/Sub
5. Worker consume (puede llegar N veces) → solo observar / notificar
```

Como el cine: primero te confirman la butaca; **después** el push de “disfruta la peli”. Si el push llega dos veces, no te mudan de asiento.

---

## 4. Mensaje (borrador)

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
| `version` | Evolucionar sin romper lectores viejos |
| `userId` | No procesar dos veces lo mismo |
| `passwordWasMissing` | Telemetría / copy del mail; **nunca** para regenerar |

Guarda “ya procesé este mensaje” en Firestore o Redis. Un reenvío no debería spamear mails.

---

## 5. Encaje hexagonal

No tiramos la arquitectura:

| Pieza | Rol |
|-------|-----|
| Puerto tipo `DomainEventPublisher` | Application publica sin saber de Pub/Sub |
| Adaptador Pub/Sub | Infra habla con GCP |
| Adaptador Nest | Local / demos |
| Audit handler actual | Prototipo; en prod se apaga o convive un rato |

---

## 6. Pasos (en orden)

1. Dejar quieto el contrato actual (ya está).
2. Sacar un puerto de publicación detrás del create.
3. Adaptador Pub/Sub detrás de una env (`EVENT_BUS=nest|pubsub`).
4. Worker idempotente.
5. Apagar efectos in-process cuando el worker esté estable.
6. (Opcional) Outbox — no es día uno; el reto no lo pide.

---

## 7. Con Cloud Run

```text
Internet → Cloud Run (Nest) → Firestore
                 └─► Pub/Sub → Function / worker
```

Nest entero en Cloud Functions suele salir caro. Una Function **sí** encaja como oyente liviano.

Detalle: README, sección GCP.

---

## 8. Checklist antes de prenderlo

- [ ] El `201` sigue después del finalize.
- [ ] No publicas si create/finalize fallaron.
- [ ] El consumidor no escribe `passwordHash`.
- [ ] Hay plan de reintentos / DLQ.
- [ ] IAM mínimo (API publica, worker suscribe).
- [ ] Test de contrato del mensaje.

Volver a: [arquitectura](./arquitectura.md) · [camino del desarrollador](./camino-del-desarrollador.md).
