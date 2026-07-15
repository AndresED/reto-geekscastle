# C4 y flujos del sistema

Acá va la infra “dibujada”. Seguimos la lógica del modelo C4 (contexto, contenedores, componentes), pero los diagramas están en **flowchart** porque GitHub y varios visores todavía no renderizan bien `C4Context` / `C4Container`.

---

## Nivel 1: Contexto

La idea general: una persona usa el panel web, la aplicación llama a nuestra API, y la API es la que consulta PokeAPI y guarda en PostgreSQL.

```mermaid
flowchart LR
    usuario(["Usuario"])
    sistema["Reto Pokemon<br/>web + api + base de datos"]
    pokeapi["PokeAPI<br/>servicio externo"]

    usuario -->|"Usa la web"| sistema
    sistema -->|"Consulta pokemon"| pokeapi
```

En pocas palabras: **el navegador nunca llama a PokeAPI**. Lo hacemos a propósito, toda la integración externa queda en el backend.

---

## Nivel 2: Contenedores

Cuando levantás Docker Compose, en realidad tenés tres servicios y un sistema externo:

```mermaid
flowchart TB
    usuario(["Usuario"])

    web["web<br/>React + nginx<br/>puerto 80"]
    api["api<br/>NestJS<br/>puerto 3000"]
    db[("db<br/>PostgreSQL 16<br/>puerto 5432")]
    pokeapi["PokeAPI<br/>REST externa"]

    usuario -->|"HTTPS"| web
    usuario -->|"Swagger"| api
    web -->|"POST pokemon"| api
    api -->|"TCP"| db
    api -->|"HTTPS"| pokeapi
```

### Tabla de puertos (la que siempre se olvida)

| Servicio | Puerto en tu máquina | Imagen Docker |
|----------|------------------------|---------------|
| `web` | 80 | `apps/web` → nginx |
| `api` | 3000 | `apps/api` → Node 20 |
| `db` | 5432 | `postgres:16-alpine` |

**Orden de arranque:** primero `db` (espera a que Postgres responda), después `api`, y `web` al final. Si la API no está, la web igual carga pero falla al agregar. Obvio, pero pasa.

---

## Nivel 3: Componentes (solo la API)

La API está organizada en hexagonal ligera. No es magia: controlador → caso de uso → puertos (PokeAPI + repositorio).

```mermaid
flowchart TB
    subgraph apiNest["API NestJS"]
        ctrl["PokemonController"]
        uc["CreatePokemonUseCase"]
        poke["PokeApiClient"]
        repo["PokemonRepository"]

        ctrl --> uc
        uc --> poke
        uc --> repo
    end

    db[("PostgreSQL<br/>tabla pokemon")]
    pokeapi["PokeAPI"]

    poke -->|"GET"| pokeapi
    repo -->|"INSERT o UPDATE"| db
```

Los filtros e interceptores (`HttpExceptionFilter`, `TransformInterceptor`) envuelven las respuestas HTTP; no los metí en el dibujo para no llenarlo de flechas.

---

## Diagrama de secuencia: camino feliz

Este es el flujo que importa para el reto: el usuario escribe “pikachu”, pulsa Agregar, y en algún momento el pokemon queda guardado.

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuario
    participant W as Web
    participant A as API
    participant P as PokeAPI
    participant D as PostgreSQL

    U->>W: Escribe pikachu y pulsa Agregar
    W->>A: POST pokemon
    Note over A: Valida entrada y ejecuta caso de uso
    A->>P: GET pokemon pikachu
    P-->>A: 200 con datos
    A->>D: Guarda o actualiza fila
    D-->>A: OK
    A-->>W: 201 respuesta estandarizada
    W-->>U: Tarjeta y estadisticas
```

Los pasos 4 al 6 suelen ir volando; si PokeAPI tarda, el usuario ve el indicador de carga en la web. Nada raro.

---

## Diagrama de secuencia: pokemon no existe

Cuando el nombre no está en PokeAPI, no guardamos nada en la BD (importante: **cero registros basura**).

```mermaid
sequenceDiagram
    actor U as Usuario
    participant W as Web
    participant A as API
    participant P as PokeAPI

    U->>W: Envia nombre invalido
    W->>A: POST pokemon
    A->>P: GET pokemon
    P-->>A: 404 Not Found
    A-->>W: 404 error estandarizado
    W-->>U: Mensaje en pantalla
```

---

## Diagrama de secuencia: PokeAPI caída

```mermaid
sequenceDiagram
    participant W as Web
    participant A as API
    participant P as PokeAPI

    W->>A: POST pokemon
    A->>P: GET pokemon
    P-->>A: timeout o 5xx
    A-->>W: 502 error estandarizado
```

---

## Diagrama de secuencia: BD falla

```mermaid
sequenceDiagram
    participant W as Web
    participant A as API
    participant P as PokeAPI
    participant D as PostgreSQL

    W->>A: POST pokemon
    A->>P: GET pokemon
    P-->>A: 200 OK
    A->>D: INSERT falla
    D-->>A: error de conexion
    A-->>W: 500 error estandarizado
```

---

## Despliegue con Docker (vista simplificada)

```mermaid
flowchart LR
    nav((Navegador))
    web["web puerto 80"]
    api["api puerto 3000"]
    db[("db puerto 5432")]
    poke["PokeAPI"]

    nav --> web
    nav --> api
    web -.->|HTTP| api
    api --> db
    api --> poke
```

---

## Referencias

- [ADR-0001: Monorepo y Docker](/docs/adr/0001-monorepo-docker-compose.md)
- [ADR-0002: Backend](/docs/adr/0002-backend-monolito-modular-hexagonal.md)
- [Base de datos: ER y diccionario](/docs/infra/base-de-datos.md)
