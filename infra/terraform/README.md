# Infrastructure as Code (Terraform)

This directory holds the Terraform configuration for provisioning the AreaScan
platform on Google Cloud Platform. It is a **skeleton** — no real resources are
declared yet. Real resource blocks are added in a later phase.

## Layout

```
infra/terraform/
├── README.md            <- this file
├── modules/             <- reusable modules (cloud-run, cloud-sql, redis, ...)
│   └── .gitkeep
└── envs/                <- one root module per environment
    ├── dev/
    │   └── main.tf      <- provider + commented resource placeholders
    ├── uat/
    └── prod/
```

### Per-environment model

Each environment under `envs/` is an independent Terraform **root module** with
its own state backend and variable values. This keeps `dev`, `uat`, and `prod`
fully isolated — you can plan/apply one without touching another.

```bash
cd envs/dev      # or uat / prod
terraform init
terraform plan
terraform apply
```

`modules/` contains the shared building blocks (e.g. a `cloud-run` module, a
`cloud-sql` module). Each env composes those modules with env-specific inputs
(machine sizes, replica counts, project IDs, domains).

## Planned GCP resources

| Concern            | GCP service                          |
| ------------------ | ------------------------------------ |
| API service        | Cloud Run                            |
| Web service        | Cloud Run                            |
| Database           | Cloud SQL for PostgreSQL (+ PostGIS) |
| Cache / rate limit | Memorystore for Redis                |
| Container images   | Artifact Registry                    |
| Object storage     | Cloud Storage                        |
| Secrets            | Secret Manager                       |

## State backend (TODO)

Before first `apply`, configure a remote backend (GCS bucket) per environment so
state is shared and locked across the team. Example backend block to add to each
`envs/<env>/main.tf`:

```hcl
terraform {
  backend "gcs" {
    bucket = "areascan-tfstate-<env>"   # TODO: create this bucket first
    prefix = "<env>"
  }
}
```

## Conventions

- Pin the `google` provider to a major version in each root module.
- Never commit `*.tfstate`, `*.tfvars` containing secrets, or `.terraform/`
  (all ignored at the repo root `.gitignore`).
- Secrets (DB passwords, API keys) live in **Secret Manager**, referenced by
  Cloud Run — never hard-coded in `.tf` files.
