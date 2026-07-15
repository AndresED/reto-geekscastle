# Terraform lite — Firebase / Firestore

IaC chica para dejar Firestore listo en un proyecto GCP (la señal de Terraform del proceso).

## Demo del challenge

Lo que se evalúa corre contra el **emulador de Firestore** (ver README raíz).  
**No** hace falta `terraform apply` para demostrar el reto.

## Uso

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars   # edita project_id
terraform init
terraform fmt -check
terraform validate
terraform plan
```

- No subas `*.tfvars`, `*.tfstate` ni credenciales.
- Aplicar en cloud es opcional y queda fuera de la demo.

Más contexto de producto: [docs/infra](../docs/infra/README.md) · [ADR-0007](../docs/adr/0007-terraform-firebase-lite.md).
