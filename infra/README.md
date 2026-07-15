# Terraform lite — Firebase / Firestore

IaC acotada para aprovisionar Firestore en un proyecto GCP (señal Terraform del proceso).

## Demo del challenge

El runtime evaluable es el **Firestore Emulator** (ver README raíz). No hace falta `terraform apply` para corregir el reto.

## Uso

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars   # editar project_id
terraform init
terraform fmt -check
terraform validate
terraform plan
```

- No commitear `*.tfvars`, `*.tfstate` ni credenciales.
- Aplicar en cloud es opcional y fuera de alcance de la entrega demo.
