# Terraform (Firebase / Firestore)

Esta carpeta tiene un Terraform **chico**: sirve para dejar Firestore preparado en un proyecto de Google Cloud.

En la postulación pidieron Terraform. Aquí está, sin inventar media nube solo para lucir.

## Para evaluar el reto

La demo que importa corre con el **emulador de Firestore**.  
Mira el README de la raíz del repo. **No** necesitas hacer `terraform apply` para probar la API.

## Cómo usarlo (si quieres ver el plan)

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars   # pon tu project_id
terraform init
terraform fmt -check
terraform validate
terraform plan
```

- No subas `*.tfvars`, `*.tfstate` ni credenciales al git.
- Subir esto a la nube de verdad es opcional y no forma parte de la demo.

Si quieres el modelo de datos y los diagramas: [docs/infra](../docs/infra/README.md).  
La decisión escrita: [ADR-0007](../docs/adr/0007-terraform-firebase-lite.md).
