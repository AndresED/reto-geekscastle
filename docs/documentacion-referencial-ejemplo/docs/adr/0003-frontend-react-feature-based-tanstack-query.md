# ADR-0003: Frontend — feature-based, smart/dumb y TanStack Query

## Estado

Aceptado

## Enmienda (2026-07-03)

Se añadió suite **Playwright** en `apps/web/e2e/` (change `add-e2e-playwright`). Requisito: [`openspec/specs/delivery/spec.md`](/openspec/specs/delivery/spec.md) — *End-to-End Acceptance Test Suite*. Vitest sigue siendo la capa unitaria; Playwright complementa con aceptación contra Docker.

## Fecha

2026-07-02

## Alcance

Decisiones **exclusivas de `apps/web`** (React): estructura de código, capas UI, server state y consumo de la API NestJS.

| Tema | ADR |
|------|-----|
| Monorepo, Docker, red | [ADR-0001](./0001-monorepo-docker-compose.md) |
| Backend NestJS | [ADR-0002](./0002-backend-monolito-modular-hexagonal.md) |
| **Frontend React** | **ADR-0003 (este)** |

## Contexto

La aplicación `apps/web` debe:

1. Consumir el contrato `POST /pokemon` de `apps/api` (ADR-0002). **No** llamar a PokeAPI desde el browser.
2. Manejar estados de UI: carga, éxito, error (validación, pokemon no encontrado, API caída).
3. Mantener código testeable y estructura clara para evaluación de diseño.
4. Aceptar entrada flexible `name` o `pokemon`, alineada al DTO del backend.

No hay autenticación, multitenant, tiempo real ni micro-frontends. Se busca coherencia con el backend (adapters + orquestación fuera de la UI) sin duplicar su estructura de carpetas.

Referencias evaluadas: [Bulletproof React](https://github.com/alan2207/bulletproof-react), [Feature-Sliced Design](https://feature-sliced.design/), [Atomic Design](https://atomicdesign.bradfrost.com/).

## Elección final

| Área | Decisión adoptada |
|------|-------------------|
| Arquitectura UI | **Feature-based** + **smart/dumb components** |
| Organización visual | **Atomic Design** solo en `shared/ui/` (atoms) |
| Runtime | **React 18** |
| Build | **Vite 6** |
| Lenguaje | **TypeScript** (`strict`) |
| Server state | **TanStack Query v5** (`useMutation`) |
| Cliente HTTP | **`fetch` nativo** vía `apiClient` en `shared/api/` |
| Formulario | **React Hook Form** + **Zod** |
| Estilos | **Tailwind CSS 4** |
| Routing | **React Router 7** |
| Tests | **Vitest** + **Testing Library** + **@testing-library/user-event** |
| Comando test | `npm run test` · `npm run test:cov` |
| Convención archivos | `*.test.tsx` / `*.test.ts` junto al fuente |
| Umbral cobertura | **Sin mínimo del reto**; ejecutar tests en capas críticas |
| Mock server state | `QueryClientProvider` con `QueryClient` de test |
| Servidor en Docker | **nginx** sirve `dist/` (puerto 80) |
| Feature v1 | **`pokemon`** (crear pokemon) |
| Página v1 | **`CreatePokemonPage`** (ruta `/`) |
| Fuente de datos | **`apps/api`** `POST /pokemon` únicamente |
| Validación formulario | Zod: requiere `name` **o** `pokemon` (no ambos vacíos) |

**Descartado definitivamente:** Redux, RTK Query, Zustand, FSD completo, hexagonal explícita en carpetas, llamadas a PokeAPI desde el browser, micro-frontends.

## Decisión

Implementar en `apps/web` la arquitectura y stack de la tabla anterior. No se evaluarán alternativas en la implementación salvo cambio formal de este ADR.

### Estructura de `apps/web`

```
apps/web/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── providers.tsx       # QueryClientProvider
│   │   └── router.tsx
│   ├── pages/
│   │   └── CreatePokemonPage.tsx
│   ├── features/
│   │   └── pokemon/
│   │       ├── api/
│   │       │   └── pokemon.api.ts
│   │       ├── hooks/
│   │       │   └── useCreatePokemon.ts
│   │       ├── components/
│   │       │   ├── PokemonForm.tsx
│   │       │   └── PokemonResult.tsx
│   │       └── types/
│   │           └── pokemon.types.ts
│   └── shared/
│       ├── api/
│       │   └── api-client.ts
│       └── ui/
│           ├── Button.tsx
│           ├── Input.tsx
│           └── ErrorMessage.tsx
├── vitest.config.ts
├── Dockerfile
├── vite.config.ts
└── package.json
```

### Estrategia de tests unitarios

El reto **no exige** umbral de cobertura en frontend, pero la arquitectura smart/dumb existe para facilitar tests. **Vitest + jsdom** cubre unitarios; **Playwright** (`apps/web/e2e/`) cubre aceptación E2E con browser real contra el stack Docker.

#### Qué testear por capa

| Capa | Archivo | Enfoque | Dependencias |
|------|---------|---------|--------------|
| **Shared UI** | `Button.test.tsx`, `Input.test.tsx` | Render, props, disabled, accesibilidad básica | Ninguna |
| **Features — components (dumb)** | `PokemonForm.test.tsx`, `PokemonResult.test.tsx` | Render según props; submit; mensajes error/loading | `user-event`; sin API |
| **Features — hooks** | `useCreatePokemon.test.ts` | Mutación exitosa; error 404/502; estado `isPending` | Mock de `pokemonApi`; `QueryClient` wrapper |
| **Features — api** | `pokemon.api.test.ts` | Llama `apiClient.post` con body correcto | Mock de `fetch` / `apiClient` |
| **Shared — api** | `api-client.test.ts` | Base URL, parseo errores HTTP | Mock de `fetch` |
| **Validación** | `pokemon.schema.test.ts` | Zod: `name` o `pokemon` requerido | — |
| **Pages (smart)** | `CreatePokemonPage.test.tsx` | Integración ligera: form → hook mockeado | Mock de `useCreatePokemon` |

**No testear:** clases Tailwind, detalles de implementación interna, llamadas reales a `apps/api`.

#### Casos de prueba obligatorios — `PokemonForm`

| # | Escenario | Resultado esperado |
|---|-----------|-------------------|
| 1 | Render inicial | Input y botón submit visibles |
| 2 | Submit vacío | Muestra error de validación |
| 3 | `loading={true}` | Botón deshabilitado |
| 4 | `error` presente | Muestra `ErrorMessage` |
| 5 | Submit con nombre | Llama `onSubmit` con valor |

#### Casos de prueba obligatorios — `useCreatePokemon`

| # | Escenario | Resultado esperado |
|---|-----------|-------------------|
| 1 | Mutación exitosa | `isSuccess` true; datos en `data` |
| 2 | API responde 404 | `isError` true; mensaje usuario |
| 3 | API responde 502 | `isError` true |
| 4 | Durante request | `isPending` true |

#### Setup de tests — hook con TanStack Query

```tsx
// test-utils.tsx
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

const wrapper = ({ children }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
);
```

#### Configuración Vitest (vinculante)

```json
// package.json — scripts
"test": "vitest run",
"test:cov": "vitest run --coverage",
"test:watch": "vitest"
```

```typescript
// vitest.config.ts
test: {
  environment: 'jsdom',
  setupFiles: ['./src/test/setup.ts'],
  globals: true,
},
```

#### Fuera de alcance (frontend)

| Tipo | Estado |
|------|--------|
| E2E Playwright | **Exigido** (delivery spec); `npm run test:e2e` en `apps/web/e2e/` |
| Tests visuales / snapshot masivo | No exigido |
| Umbral 85 % cobertura | No exigido por reto (sí en backend) |

#### Convención de nombres

```
should <comportamiento> when <condición>
```

### Reglas de capas

| Capa | Responsabilidad | Puede importar de |
|------|-----------------|-------------------|
| `shared/ui/` | Componentes visuales sin API ni negocio | React, utilidades puras |
| `shared/api/` | Cliente HTTP base, errores genéricos | Librería HTTP |
| `features/*/api/` | Adapter (`pokemonApi.create`) | `shared/api`, tipos del feature |
| `features/*/hooks/` | Orquestación (`useCreatePokemon`) | `features/*/api`, TanStack Query |
| `features/*/components/` | Componentes **dumb** (solo props) | `shared/ui`, tipos del feature |
| `pages/` | Componentes **smart** | `features/*`, `shared/ui` |
| `app/` | Bootstrap, providers, router | Cualquier capa |

**Regla de oro:** `shared/ui/` y `features/*/components/` no importan TanStack Query, `fetch` ni `apiClient`.

### Mapeo conceptual con backend (ADR-0002)

| Backend (`apps/api`) | Frontend (`apps/web`) |
|----------------------|------------------------|
| `PokemonController` | `CreatePokemonPage` |
| `CreatePokemonUseCase` | `useCreatePokemon` |
| Contrato `POST /pokemon` | `pokemonApi` + `pokemon.types.ts` |
| Errores dominio → HTTP | HTTP → `ErrorMessage` / `aria-live` |

### Atomic Design — solo en `shared/ui/`

- **Atoms obligatorios:** `Button`, `Input`, `ErrorMessage`
- **Sin capa molecules** en v1 (composición inline en features si hace falta)

Organismos de negocio (`PokemonForm`, `PokemonResult`) viven en `features/pokemon/components/`.

### Flujo principal

```
Usuario
  → CreatePokemonPage          [smart]
    → PokemonForm                [dumb]
      → useCreatePokemon         [hook]
        → pokemonApi.create      [adapter]
          → apiClient.post('/pokemon')
  ← loading | error | PokemonResult
```

### Configuración de API

La URL base se inyecta vía `VITE_API_BASE_URL` (ver ADR-0001). `apiClient` la lee en build/runtime; no hay URLs hardcodeadas en componentes.

### Manejo de errores en UI

| Origen | Comportamiento |
|--------|----------------|
| Validación Zod | Mensaje inline en campo |
| `404` | Pokemon no encontrado |
| `502/503` | PokeAPI no disponible |
| `500` | Error del servidor |
| `isPending` | Submit deshabilitado + indicador de carga |

## Alternativas consideradas

### A. Redux Toolkit + RTK Query

**Pros:** Estado global predecible.  
**Contras:** Boilerplate para una mutación.  
**Veredicto:** Descartado.

### B. FSD completo

**Pros:** Reglas de import estrictas.  
**Contras:** Capas vacías con una sola feature.  
**Veredicto:** Descartado. Espíritu FSD sin todas las capas.

### C. Atomic Design como arquitectura raíz

**Pros:** UI organizada.  
**Contras:** No cubre API ni hooks.  
**Veredicto:** Descartado como raíz; solo `shared/ui/`.

### D. Hexagonal explícita en frontend

**Pros:** Simetría con backend.  
**Contras:** Carpetas extra; hooks ya cumplen el rol de application.  
**Veredicto:** Descartado.

### E. Feature-based + smart/dumb + TanStack Query (elegida)

**Pros:** Testeable, pragmática, alineada con estándar de facto.  
**Contras:** Menos “enterprise” en papel que FSD completo.  
**Veredicto:** Aceptada.

## Consecuencias

### Positivas

- Diagrama de secuencia frontend paralelo al del backend.
- `PokemonForm` testeable solo con props.
- `GET /pokemon` futuro: nuevo hook + página sin reestructurar.

### Negativas

- Tipos duplicados respecto a `apps/api` hasta `packages/types`.
- Tailwind añade config inicial.

## Criterios de aceptación

La implementación debe cumplir **todos** los ítems de **Elección final** y:

- [ ] Código en `apps/web/src/` según estructura definida.
- [ ] `PokemonForm` y `PokemonResult` son dumb (solo props).
- [ ] `useCreatePokemon` con TanStack Query `useMutation`.
- [ ] `apiClient` con `fetch` nativo y `VITE_API_BASE_URL`.
- [ ] `QueryClientProvider` en `app/providers.tsx`.
- [ ] Zod: `name` o `pokemon` requerido.
- [ ] UI con estados `loading`, `error`, `success`.
- [ ] Atoms en `shared/ui/`: `Button`, `Input`, `ErrorMessage`.
- [ ] Ruta `/` → `CreatePokemonPage`.
- [ ] Sin llamadas a PokeAPI desde el browser.
- [ ] `npm run test` en `apps/web` pasa sin errores.
- [ ] Specs de: `PokemonForm`, `PokemonResult`, `useCreatePokemon`, `pokemon.api`.
- [ ] Casos obligatorios de `PokemonForm` y `useCreatePokemon` implementados.
- [ ] Tests de componentes dumb **sin** mock de red (solo props).
- [ ] `vitest.config.ts` con `environment: 'jsdom'`.

## Referencias

- [ADR-0001 — Monorepo y Docker](./0001-monorepo-docker-compose.md)
- [ADR-0002 — Backend](./0002-backend-monolito-modular-hexagonal.md)
- [Bulletproof React](https://github.com/alan2207/bulletproof-react)
- [TanStack Query — Mutations](https://tanstack.com/query/latest/docs/framework/react/guides/mutations)
- [Atomic Design](https://atomicdesign.bradfrost.com/)
