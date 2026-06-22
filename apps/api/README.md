# AreaScan API

Production-grade FastAPI backend for the AreaScan Tourism Platform.

- Python 3.12
- FastAPI + Uvicorn
- SQLAlchemy 2.0 (async, asyncpg) + Alembic (sync, psycopg)
- Redis (async)
- Pydantic v2 / pydantic-settings v2

API is mounted under `/api/v1`. OpenAPI schema at `/api/v1/openapi.json`.

## Layout

```
apps/api
├── app
│   ├── api/v1/        # versioned routers (health, ...)
│   ├── core/          # config, db, redis, security, logging
│   ├── models/        # SQLAlchemy declarative models
│   ├── schemas/       # Pydantic request/response models
│   ├── deps.py        # shared FastAPI dependencies
│   └── main.py        # app factory, middleware, lifespan
├── alembic/           # migrations (env.py reads SYNC_DATABASE_URL)
└── tests/             # pytest-asyncio + httpx ASGITransport
```

## Environment

Copy `.env.example` to `.env` and fill in secrets:

```bash
cp .env.example .env
```

Inside docker-compose, DB/redis hosts are `db` / `redis`. On your host machine
use `localhost` instead (e.g. `postgresql+asyncpg://areascan:areascan@localhost:5432/areascan`).

## Install

Using [uv](https://docs.astral.sh/uv/) (recommended):

```bash
uv venv
uv pip install -e ".[dev]"
```

Or with plain pip:

```bash
python -m venv .venv
# Windows:  .venv\Scripts\activate
# Unix:     source .venv/bin/activate
pip install -e ".[dev]"
```

## Run

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Then visit:

- Health: http://localhost:8000/api/v1/health
- Docs:   http://localhost:8000/docs
- OpenAPI: http://localhost:8000/api/v1/openapi.json

## Database migrations (Alembic)

Alembic uses the **sync** driver via `SYNC_DATABASE_URL`.

```bash
# Autogenerate a migration after changing models
alembic revision --autogenerate -m "describe change"

# Apply migrations
alembic upgrade head

# Roll back one revision
alembic downgrade -1
```

## Tests

```bash
pytest
```

## Lint

```bash
ruff check .
ruff format .
```
