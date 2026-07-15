# Base de datos

PostgreSQL 16, una tabla principal por ahora. Sí, es simple, pero para el alcance del reto alcanza y sobra.

TypeORM usa `synchronize: true`, o sea que **no hay migraciones versionadas** en v1. Al levantar la API, el esquema se crea/ajusta solo. Para producción real probablemente migrarías a migraciones explícitas, pero acá no era el foco.

---

## Diagrama entidad-relación

Solo existe la entidad `pokemon`. No hay relaciones con otras tablas (todavía).

```mermaid
erDiagram
  POKEMON {
    int id PK "ID de PokeAPI"
    varchar name "Nombre en minúsculas"
    int height "Altura (decímetros)"
    int weight "Peso (hectogramos)"
    int base_experience "Experiencia base"
    timestamptz saved_at "Cuándo lo guardamos nosotros"
  }
```

Visualmente es una sola tabla suelta, sin relaciones con otras por ahora.

---

## Diccionario de datos

### Tabla: `pokemon`

Guarda los pokemon que el usuario fue creando vía `POST /pokemon`. El `id` viene de PokeAPI (no es un serial autogenerado nuestro).

| Campo | Tipo (PostgreSQL) | Nulo | Descripción |
|-------|-------------------|------|-------------|
| `id` | `integer` | NO | Identificador del pokemon en PokeAPI. Es la clave primaria; si guardás el mismo pokemon otra vez, se actualiza el registro existente. |
| `name` | `varchar` | NO | Nombre del pokemon, normalmente en minúsculas (`pikachu`, `bulbasaur`, etc.). |
| `height` | `integer` | NO | Altura según PokeAPI, en **decímetros**. Ej: Pikachu = 4 → 0.4 m. |
| `weight` | `integer` | NO | Peso según PokeAPI, en **hectogramos**. Ej: 60 → 6.0 kg. |
| `base_experience` | `integer` | NO | Experiencia base que devuelve PokeAPI (`base_experience` en su JSON). |
| `saved_at` | `timestamptz` | NO | Timestamp de cuándo **nosotros** lo persistimos. Es el “dato propio” del reto; PokeAPI no te da esto. |

### Mapeo código ↔ columna

En TypeORM la entidad se llama `PokemonOrmEntity` y la tabla física es `pokemon`:

| Propiedad en código | Columna en BD |
|--------------------|---------------|
| `id` | `id` |
| `name` | `name` |
| `height` | `height` |
| `weight` | `weight` |
| `baseExperience` | `base_experience` |
| `savedAt` | `saved_at` |

---

## Reglas de negocio (las que importan en la BD)

1. **El id manda.** Viene de afuera (PokeAPI). No inventamos ids locales.
2. **Re-guardar el mismo pokemon** actualiza el registro existente, útil si alguien vuelve a buscar “pikachu”.
3. **Si PokeAPI falla o no encuentra el nombre**, no se escribe fila alguna. La BD solo ve datos que pasaron validación externa.
4. **`saved_at` siempre se renueva** en cada guardado exitoso, es cuando nosotros confirmamos la operación.

---

## Conexión (Docker vs local)

| Entorno | Cadena de conexión típica |
|---------|--------------------------|
| Docker Compose | `postgresql://pokemon:changeme@db:5432/pokemon` |
| API local + Postgres en host | `postgresql://pokemon:changeme@localhost:5432/pokemon` |

Variables en `.env.example`: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DATABASE_URL`.

---

## Consultas útiles (por curiosidad)

Ver los últimos guardados:

```sql
SELECT id, name, height, weight, base_experience, saved_at
FROM pokemon
ORDER BY saved_at DESC;
```

Contar cuántos hay:

```sql
SELECT COUNT(*) FROM pokemon;
```

---

## Qué podría venir después (pero no está)

Por si te lo preguntás: no hay tablas de tipos (`fire`, `water`…), usuarios, ni historial de búsquedas. El frontend calcula las estadísticas de sesión en memoria. Si algún día agregás `GET /pokemon` o tipos desde PokeAPI, ahí recién tendría sentido crecer el modelo.

---

## Referencias

- Entidad: `apps/api/src/modules/pokemon/infrastructure/persistence/pokemon.orm-entity.ts`
- [ADR-0002: Backend](/docs/adr/0002-backend-monolito-modular-hexagonal.md)
- [C4 y flujos](/docs/infra/c4-y-flujos.md)
