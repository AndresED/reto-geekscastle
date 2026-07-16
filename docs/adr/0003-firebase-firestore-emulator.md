# ADR-0003: Firebase Firestore + Emulator (Admin SDK)

## Estado

Aceptado

## Fecha

2026-07-15

## Alcance

Cómo Nest persiste `User` en Firebase y cómo se desarrolla en local sin proyecto de producción.

## Contexto

El reto obliga Firebase como base de datos y sugiere Firebase Admin SDK + emuladores (Firestore, Auth, etc.).  
No exige Firebase Authentication como IdP ni Cloud Functions.

## Elección final

| Área | Decisión |
|------|----------|
| Producto Firebase | **Cloud Firestore** (documentos) |
| SDK en Nest | **firebase-admin** |
| Auth de usuarios finales | **No** en v1 (Firestore solo como DB) |
| Local | **Firestore Emulator** (Firebase CLI) |
| Credenciales local | Project id dummy + env de emulator; sin service account real en repo |
| Colección | `users` |
| ID documento | Auto-id de Firestore (o UUID generado en app; una sola estrategia, documentada en código) |
| Campos persistidos | `username`, `email`, `passwordHash` (nullable hasta evento), `createdAt`, `updatedAt`, `passwordGenerated` (bool) |
| Respuesta API | Nunca serializa `passwordHash` |

## Decisión

### Conexión local al emulator

1. `firebase init emulators` → habilitar **Firestore**.
2. `firebase emulators:start`.
3. Antes de `admin.initializeApp()`, setear:

```bash
FIRESTORE_EMULATOR_HOST=127.0.0.1:8085
GCLOUD_PROJECT=demo-reto-geekscastle
```

(Valores exactos alineados a `firebase.json` / `.env.example`.)

### Bootstrap Admin

- Un provider Nest (`FirebaseAdminProvider` o similar) llama `initializeApp` **una vez**.
- El repository obtiene `getFirestore()` y opera sobre `collection('users')`.
- En CI unitario **no** se requiere emulator: repository y handlers se testean con mocks del port / Admin.

### Por qué no Realtime Database

Firestore es el default moderno del ecosistema emulator + documentos tipados encajan con entidad User. RTDB añadiría otro modelo sin beneficio al reto.

### Por qué no solo Firebase Auth

Auth gestiona identidad, no sustituye el modelo “entidad User con password opcional + evento al insertar” sobre una DB. Guardar passwordHash en Auth `createUser` mezclaría concerns y complica el evento de update del reto. **Decisión:** passwordHash en documento Firestore.

## Alternativas consideradas

### A. Firestore + Cloud Function onCreate

Descartada como path principal (ver ADR-0002).

### B. Proyecto Firebase cloud desde el día 1

**Pros:** “Real”. **Contras:** secretos, cuenta, fricción para evaluador. **Veredicto:** Opcional; emulator es el camino documentado.

### C. Firestore Emulator + Admin SDK (elegida)

Alineado a pistas del reto.

## Consecuencias

- README debe listar Firebase CLI como prerequisito.
- Tests de cobertura 80 % no dependen del emulator; opcional smoke manual/local.
- Variables sensibles nunca en git.

## Criterios de aceptación

- [x] Adapter Firestore implementa `UserRepositoryPort`.
- [x] Happy path local contra emulator documentado.
- [x] `.env.example` con vars de emulator.
- [x] Ningún JSON de service account commiteado.
