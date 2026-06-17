# AreaScan — Tourism Platform

AreaScan is an AI-assisted travel planning platform. A **FastAPI** backend and a
**Next.js 15** frontend run as containerized services backed by
**PostgreSQL/PostGIS** and **Redis**.

> Architecture in one line: Next.js (web) → FastAPI (`/api/v1`) → PostgreSQL +
> PostGIS for data/geo and Redis for caching & rate-limiting; AI features via the
> Anthropic API. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Monorepo layout

```
.
├── apps/
│   ├── api/                 # FastAPI backend (Python 3.12)
│   └── web/                 # Next.js 15 frontend (TypeScript)
├── infra/
│   ├── sql/init.sql         # DB extensions bootstrap (postgis, pg_trgm, ...)
│   └── terraform/           # GCP IaC skeleton (dev/uat/prod)
├── .github/workflows/       # CI (lint/test/build) + deploy (Cloud Run)
├── docker-compose.yml       # local orchestration (db, redis, api, web)
├── Makefile                 # convenience targets (up, down, migrate, lint, ...)
└── docs/                    # ARCHITECTURE.md, DATABASE.md, API.md
```

## Quickstart

Requires Docker Desktop (with Docker Compose v2).

```bash
# 1. Copy env templates (see .env.example for what goes where)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 2. Boot the whole stack
docker compose up --build
```

Then open:

- Web app:    http://localhost:3000
- API health: http://localhost:8000/api/v1/health
- API docs:   http://localhost:8000/api/v1/openapi.json

## Services & ports

| Service  | Host port | In-network host |
| -------- | --------- | --------------- |
| web      | 3000      | `web`           |
| api      | 8000      | `api`           |
| postgres | 5432      | `db`            |
| redis    | 6379      | `redis`         |

## Configuration

Secrets and per-app settings are documented in [`.env.example`](.env.example),
which points to `apps/api/.env.example` and `apps/web/.env.example`. Never commit
real `.env` files — they are git-ignored.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system design & components
- [`docs/DATABASE.md`](docs/DATABASE.md) — schema, extensions, migrations
- [`docs/API.md`](docs/API.md) — REST API surface (`/api/v1`)
- [`infra/terraform/README.md`](infra/terraform/README.md) — cloud infrastructure

## Development

Common tasks are wrapped in the [`Makefile`](Makefile):

```bash
make up         # docker compose up --build -d
make down       # stop and remove containers
make logs       # tail all service logs
make migrate    # run Alembic migrations inside the api container
make lint       # lint api + web
make test       # run api + web tests
make fmt        # auto-format api + web
```

> **Windows users:** if `make` is unavailable, run the underlying commands shown
> in the `Makefile` directly (e.g. `docker compose up --build -d`).

## Deployment

Container images are built and pushed to **Artifact Registry** and deployed to
**Cloud Run** via GitHub Actions (`.github/workflows/deploy.yml`), authenticating
with **Workload Identity Federation**. Environments: `dev` → `uat` → `prod`
(prod gated behind a manual approval). Infrastructure is defined under
`infra/terraform/`.
