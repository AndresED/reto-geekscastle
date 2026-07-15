# ADR-0007: Terraform lite para Firebase (IaC demostrable)

## Estado

Aceptado

## Fecha

2026-07-15

## Alcance

Cómo demostrar **Terraform** alineado al reto Firebase, sin exigir `terraform apply` en cloud al evaluador.

## Contexto

El PDF se evalúa con Nest + Firebase (emulator válido). El proceso de postulación pidió experiencia en **Terraform**.  
Deadline: **2026-07-16 12:00 CDMX** — no hay margen para un landing zone GCP completo.

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

Incluir un módulo Terraform **documentado y validable** que describe la infra cloud “si se desplegara de verdad”. El camino feliz del challenge sigue siendo **Firestore Emulator + Admin SDK**.

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

Cumple PDF; ignora señal del proceso. **Descartada.**

### B. Terraform full (Cloud Run + LB + Secret Manager + CI apply)

Sobre-ingeniería vs deadline. **Descartada v1.**

### C. Terraform lite + emulator como runtime demo (elegida)

Señal IaC + entrega del desafio intacta.

## Consecuencias

- README distingue: *run challenge* (emulator) vs *provision cloud* (terraform plan).
- US-22 en requisitos cubre artefactos `infra/`.

## Criterios de aceptación

- [x] Carpeta `infra/` con configuración Terraform formateada.
- [x] `terraform validate` documentado (y ejecutado al menos en autoría / CI).
- [x] Sin secretos ni state sensible en el repo.
- [x] Docs cruzan a ADR-0003 (emulator) y ADR-0005 (secretos).
