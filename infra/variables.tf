variable "project_id" {
  description = "GCP project id that hosts Firebase / Firestore"
  type        = string
}

variable "region" {
  description = "Default GCP region"
  type        = string
  default     = "us-central1"
}

variable "firestore_location" {
  description = "Firestore location (multi-region or regional)"
  type        = string
  default     = "nam5"
}
