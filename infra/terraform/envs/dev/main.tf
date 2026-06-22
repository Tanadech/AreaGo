#############################################
# AreaScan — DEV environment (skeleton)
#
# This is a SKELETON. No real resources are created yet — every resource block
# is commented out and marked with TODO. Fill in project IDs, regions, and
# module wiring in a later phase.
#############################################

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  # TODO: configure a remote GCS backend before first apply (see infra/terraform/README.md)
  # backend "gcs" {
  #   bucket = "areascan-tfstate-dev"
  #   prefix = "dev"
  # }
}

############################
# Variables
############################

variable "project_id" {
  description = "GCP project ID for the dev environment"
  type        = string
  # TODO: set via terraform.tfvars or -var
  default = "areascan-dev" # TODO: replace with real project ID
}

variable "region" {
  description = "Primary GCP region"
  type        = string
  default     = "asia-southeast1"
}

############################
# Provider
############################

provider "google" {
  project = var.project_id
  region  = var.region
}

#############################################
# Resource placeholders (all commented — TODO)
#############################################

# --- Artifact Registry: container image repo ---------------------------------
# TODO: enable artifactregistry.googleapis.com first
# resource "google_artifact_registry_repository" "containers" {
#   location      = var.region
#   repository_id = "areascan"
#   format        = "DOCKER"
# }

# --- Cloud Run: API service --------------------------------------------------
# TODO: point image at Artifact Registry, wire env from Secret Manager
# resource "google_cloud_run_v2_service" "api" {
#   name     = "areascan-api"
#   location = var.region
#   template {
#     containers {
#       image = "${var.region}-docker.pkg.dev/${var.project_id}/areascan/api:latest"
#       ports { container_port = 8000 }
#       # env { ... }  # ENV, DATABASE_URL, REDIS_URL, JWT_SECRET, ... (from Secret Manager)
#     }
#   }
# }

# --- Cloud Run: Web service --------------------------------------------------
# resource "google_cloud_run_v2_service" "web" {
#   name     = "areascan-web"
#   location = var.region
#   template {
#     containers {
#       image = "${var.region}-docker.pkg.dev/${var.project_id}/areascan/web:latest"
#       ports { container_port = 3000 }
#       # env { name = "NEXT_PUBLIC_API_BASE_URL" value = "https://<api-url>/api/v1" }
#     }
#   }
# }

# --- Cloud SQL: PostgreSQL (+ PostGIS extension enabled in-db) ----------------
# TODO: pick tier/disk, set deletion_protection=true for prod
# resource "google_sql_database_instance" "postgres" {
#   name             = "areascan-pg-dev"
#   database_version = "POSTGRES_16"
#   region           = var.region
#   settings {
#     tier = "db-custom-1-3840"
#   }
# }
# resource "google_sql_database" "areascan" {
#   name     = "areascan"
#   instance = google_sql_database_instance.postgres.name
# }

# --- Memorystore: Redis ------------------------------------------------------
# resource "google_redis_instance" "cache" {
#   name           = "areascan-redis-dev"
#   tier           = "BASIC"
#   memory_size_gb = 1
#   region         = var.region
#   redis_version  = "REDIS_7_0"
# }

# --- Cloud Storage: object bucket --------------------------------------------
# resource "google_storage_bucket" "assets" {
#   name     = "${var.project_id}-assets"
#   location = var.region
# }

# --- Secret Manager: app secrets ---------------------------------------------
# TODO: one secret per sensitive value; grant Cloud Run SA accessor role
# resource "google_secret_manager_secret" "jwt_secret" {
#   secret_id = "JWT_SECRET"
#   replication { auto {} }
# }
# resource "google_secret_manager_secret" "anthropic_api_key" {
#   secret_id = "ANTHROPIC_API_KEY"
#   replication { auto {} }
# }
# resource "google_secret_manager_secret" "google_maps_server_key" {
#   secret_id = "GOOGLE_MAPS_SERVER_KEY"
#   replication { auto {} }
# }
