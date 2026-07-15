# Reto técnico — Pokemon

> **Fuente de verdad (OpenSpec):** `openspec/specs/`  
> Este archivo es el índice de historias. Los requisitos testeables viven en los specs por dominio.

**Objetivo:** Aplicación **fullstack** en monorepo: backend NestJS (`POST /pokemon`, PokeAPI, persistencia) + frontend React (UI para crear pokemon). Incluir diagrama de la solución.

**Contacto entrega:** [evers.rivero@amaris.com](mailto:evers.rivero@amaris.com)

---

## Mapa de historias → OpenSpec

| ID | Historia (resumen) | Spec | Requirement |
|----|-------------------|------|-------------|
| **US-01** | Monorepo con `apps/api` y `apps/web` | [monorepo/spec.md](/openspec/specs/monorepo/spec.md) | Monorepo Structure |
| **US-02** | PokeAPI solo en backend, nunca en browser | [monorepo/spec.md](/openspec/specs/monorepo/spec.md) | PokeAPI Integration Boundary |
| **US-03** | Backend en NestJS + TypeScript | [backend/spec.md](/openspec/specs/backend/spec.md) | Backend Technology Stack |
| **US-04** | Persistir pokemon en base de datos | [backend/spec.md](/openspec/specs/backend/spec.md) | Database Persistence |
| **US-05** | `POST /pokemon` con `{ "name": "..." }` | [backend/spec.md](/openspec/specs/backend/spec.md) | Create Pokemon Endpoint |
| **US-06** | Aceptar también `{ "pokemon": "..." }` | [backend/spec.md](/openspec/specs/backend/spec.md) | Create Pokemon Endpoint |
| **US-07** | Extraer ID, nombre y 3+ campos de PokeAPI | [backend/spec.md](/openspec/specs/backend/spec.md) | PokeAPI Data Extraction |
| **US-08** | Error si PokeAPI no responde | [backend/spec.md](/openspec/specs/backend/spec.md) | Backend Error Handling — PokeAPI Unavailable |
| **US-09** | Error si respuesta PokeAPI inválida | [backend/spec.md](/openspec/specs/backend/spec.md) | Backend Error Handling — Invalid PokeAPI Response |
| **US-10** | Error si pokemon no existe | [backend/spec.md](/openspec/specs/backend/spec.md) | Backend Error Handling — Invalid PokeAPI Response |
| **US-11** | Error si falla la base de datos | [backend/spec.md](/openspec/specs/backend/spec.md) | Backend Error Handling — Database Failure |
| **US-12** | Tests backend Jest ≥ 85 % | [backend/spec.md](/openspec/specs/backend/spec.md) | Backend Unit Test Coverage |
| **US-13** | Frontend React + TypeScript + Vite | [frontend/spec.md](/openspec/specs/frontend/spec.md) | Frontend Technology Stack |
| **US-14** | Pantalla crear pokemon vía API propia | [frontend/spec.md](/openspec/specs/frontend/spec.md) | Create Pokemon Screen |
| **US-15** | Formulario con `name` o `pokemon` | [frontend/spec.md](/openspec/specs/frontend/spec.md) | Flexible Name Input |
| **US-16** | UI en estado loading | [frontend/spec.md](/openspec/specs/frontend/spec.md) | UI Loading State |
| **US-17** | UI muestra errores (validación, 404, 5xx) | [frontend/spec.md](/openspec/specs/frontend/spec.md) | UI Error States |
| **US-18** | Frontend sin llamadas a PokeAPI | [frontend/spec.md](/openspec/specs/frontend/spec.md) | Backend-Only Data Source |
| **US-19** | Tests unitarios frontend (capas críticas) | [frontend/spec.md](/openspec/specs/frontend/spec.md) | Frontend Unit Tests |
| **US-24** | Layout dashboard (Ref-01) | [frontend/spec.md](/openspec/specs/frontend/spec.md) | Dashboard Layout |
| **US-25** | Stats Total / Tipos / Último | [frontend/spec.md](/openspec/specs/frontend/spec.md) | Dashboard Statistics |
| **US-26** | Tarjeta detalle con campos backend | [frontend/spec.md](/openspec/specs/frontend/spec.md) | Pokemon Detail Card |
| **US-27** | Empty state + dark theme default | [frontend/spec.md](/openspec/specs/frontend/spec.md) | Empty Initial State · Dark Theme Default |
| **US-20** | Repositorio público | [delivery/spec.md](/openspec/specs/delivery/spec.md) | Public Repository |
| **US-21** | `docker compose up --build` levanta todo | [delivery/spec.md](/openspec/specs/delivery/spec.md) | Docker Compose Fullstack Deployment |
| **US-22** | README con run, tests, curl, URL web | [delivery/spec.md](/openspec/specs/delivery/spec.md) | README Documentation |
| **US-23** | Diagrama secuencia/flujo fullstack | [delivery/spec.md](/openspec/specs/delivery/spec.md) | Solution Diagram |

---

## Historias de usuario (formato ágil)

### Epic: Monorepo y límites

- **US-01** — Como evaluador, quiero un monorepo con `apps/api` y `apps/web`, para revisar backend y frontend en un solo repositorio.  
  → `openspec/specs/monorepo/spec.md` · escenarios: *Repository layout*

- **US-02** — Como arquitecto, quiero que PokeAPI solo la consuma el backend, para no exponer integraciones externas en el browser.  
  → `openspec/specs/monorepo/spec.md` · escenarios: *External API access from browser*, *External API access from backend*

### Epic: Backend — Crear pokemon

- **US-03** — Como evaluador, quiero el backend en NestJS + TypeScript, para validar uso idiomático del framework.  
  → `openspec/specs/backend/spec.md` · *Backend framework*

- **US-04** — Como sistema, quiero persistir cada pokemon en base de datos, para conservar la información obtenida.  
  → `openspec/specs/backend/spec.md` · *Successful persistence*

- **US-05 / US-06** — Como cliente API, quiero `POST /pokemon` con `name` o `pokemon`, para crear un pokemon existente en PokeAPI.  
  → `openspec/specs/backend/spec.md` · *Create with name field*, *Create with pokemon field*

- **US-07** — Como sistema, quiero extraer ID, nombre y al menos 3 campos más de PokeAPI, para cumplir el contrato de datos del reto.  
  → `openspec/specs/backend/spec.md` · *Minimum fields from PokeAPI*

- **US-08–US-11** — Como cliente, quiero errores claros si PokeAPI falla, responde mal, no encuentra el pokemon o la DB falla.  
  → `openspec/specs/backend/spec.md` · escenarios de *Error Handling*

- **US-12** — Como evaluador, quiero ≥ 85 % cobertura unitaria en backend con Jest, para cumplir criterio de evaluación.  
  → `openspec/specs/backend/spec.md` · *Coverage threshold*

### Epic: Frontend — Interfaz crear pokemon

- **US-13** — Como evaluador, quiero frontend en React + TypeScript + Vite.  
  → `openspec/specs/frontend/spec.md` · *Frontend stack*

- **US-14** — Como usuario, quiero una pantalla para crear un pokemon y ver el resultado guardado.  
  → `openspec/specs/frontend/spec.md` · *Successful pokemon creation from UI*

- **US-15** — Como usuario, quiero ingresar el nombre en `name` o `pokemon`.  
  → `openspec/specs/frontend/spec.md` · *Submit with name/pokemon field*

- **US-16–US-17** — Como usuario, quiero ver loading, éxito y errores comprensibles.  
  → `openspec/specs/frontend/spec.md` · *UI Loading State*, *UI Error States*

- **US-18** — Como arquitecto, quiero que el frontend solo hable con nuestra API.  
  → `openspec/specs/frontend/spec.md` · *No direct PokeAPI calls*

- **US-19** — Como desarrollador, quiero tests unitarios en formulario y hook de API.  
  → `openspec/specs/frontend/spec.md` · *Critical UI tests exist*

### Epic: Entrega y evaluación

- **US-20–US-23** — Como evaluador, quiero repo público, Docker Compose, README y diagrama fullstack.  
  → `openspec/specs/delivery/spec.md`

---

## Criterios de evaluación (reto original)

1. Diseño de la solución (backend y frontend)
2. Calidad del código (NestJS y React idiomáticos)
3. Manejo de errores (backend y frontend)
4. Uso correcto de Docker (fullstack)
5. Cobertura tests unitarios backend ≥ **85 %**

---

## Cómo usar con OpenSpec

```bash
# 1. Inicializar OpenSpec en el proyecto (una vez)
npx openspec init

# 2. Validar specs existentes
openspec validate --specs

# 3. Proponer un cambio sobre estas historias
# En Cursor / agente compatible:
/opsx:propose <nombre-del-cambio>

# 4. Implementar según tasks generados
/opsx:apply <nombre-del-cambio>

# 5. Al completar, archivar (merge deltas → specs/)
/opsx:archive <nombre-del-cambio>
```

**Estructura:**

```
openspec/
├── config.yaml
├── changes/archive/    # historial de cambios aplicados
└── specs/
    ├── monorepo/spec.md    # US-01, US-02
    ├── backend/spec.md     # US-03 – US-12
    ├── frontend/spec.md    # US-13 – US-19, US-24 – US-27
    └── delivery/spec.md    # US-20 – US-23
```

**Complemento:** decisiones de implementación en `docs/adr/` (no reemplazan los specs; definen el *cómo*).  
**UI / wireframes:** [`docs/ui/wireframes-referencia.md`](/docs/ui/wireframes-referencia.md)

---

## Notas

- PokeAPI obligatoria en backend: https://pokeapi.co/
- Migraciones de base de datos **no** requeridas
- ADRs y tests frontend valorados; umbral 85 % solo aplica a backend
