# ADR-0007: Terraform lite para Firebase

## Estado

Aceptado

## Fecha

2026-07-15

## Alcance

Cómo mostramos **Terraform** en el repo sin obligar al evaluador a hacer `terraform apply` en la nube.

## Contexto

El PDF se evalúa con Nest + Firebase (con el emulador alcanza). En el proceso también pidieron experiencia con **Terraform**.  
Fecha límite: **2026-07-16 12:00 CDMX** — no da para armar toda una plataforma en GCP.

## Elección final

| Área | Decisión |
|------|----------|
| IaC | **Terraform** bajo `infra/` |
| Provider | `hashicorp/google` (+ `google-beta` solo si hace falta Firestore API) |
| Alcance v1 | Proyecto GCP placeholder, enable APIs Firestore, recurso Firestore DB (modo Native) **parametrizado** |
| Secrets | Variables / `TF_VAR_*` / `.tfvars` **gitignored**; nunca keys en repo |
| Apply obligatorio para demo | **No** — evaluador usa emulator (ADR-0003) |
| Validación | `terraform fmt -check` + `terraform validate` (CI opcional o script local) |
| CD apply automático | Fuera de alcance |

## Decisión

Metemos un Terraform **documentado y que pase `validate`**, que describe la infra cloud “si un día se desplegara de verdad”.  
Para el challenge, el camino feliz sigue siendo **emulador de Firestore + Admin SDK**.

```
infra/
├── versions.tf
├── providers.tf
├── variables.tf
├── main.tf          # project services + firestore (según APIs disponibles)
├── outputs.tf
└── README.md        # init/plan; no commit de tfstate con secretos
```

### Qué no hacer

- No empujar state con credenciales a git.
- No acoplar Nest a outputs de Terraform en local (env manual / `.env`).
- No inventar VPC/GKE/Cloud Run “para lucir” — fuera del PDF.

## Alternativas consideradas

### A. Sin Terraform

Cumple el PDF, pero no muestra Terraform. **Descartada.**

### B. Terraform full (Cloud Run + LB + Secret Manager + CI apply)

Sobre-ingeniería vs deadline. **Descartada v1.**

### C. Terraform pequeño + emulador para la demo (elegida)

Se ve Terraform en el repo y la entrega del reto no se complica.

## Consecuencias

- El README separa: correr el reto (emulador) vs mirar el plan cloud (`terraform plan`).
- La historia US-22 cubre lo que hay en `infra/`.

## Criterios de aceptación

- [x] Carpeta `infra/` con configuración Terraform formateada.
- [x] `terraform validate` documentado (y ejecutado al menos en autoría / CI).
- [x] Sin secretos ni state sensible en el repo.
- [x] Docs cruzan a ADR-0003 (emulator) y ADR-0005 (secretos).
