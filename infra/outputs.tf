output "firestore_database_name" {
  description = "Firestore database name"
  value       = google_firestore_database.default.name
}

output "project_id" {
  description = "GCP project id"
  value       = var.project_id
}
