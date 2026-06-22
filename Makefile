# AreaScan — developer convenience targets.
#
# Windows note: if `make` is not installed, run the commands shown under each
# target directly (e.g. `docker compose up --build -d`).

COMPOSE ?= docker compose

.DEFAULT_GOAL := help
.PHONY: help up down logs migrate lint test fmt

help: ## Show this help
	@echo "AreaScan make targets:"
	@echo "  up       Build and start the full stack (detached)"
	@echo "  down     Stop and remove containers"
	@echo "  logs     Tail logs from all services"
	@echo "  migrate  Run Alembic migrations in the api container"
	@echo "  lint     Lint api (ruff) and web (eslint)"
	@echo "  test     Run api (pytest) and web tests"
	@echo "  fmt      Auto-format api (ruff) and web (prettier)"

up: ## Build and start the full stack (detached)
	$(COMPOSE) up --build -d

down: ## Stop and remove containers
	$(COMPOSE) down

logs: ## Tail logs from all services
	$(COMPOSE) logs -f

migrate: ## Run Alembic migrations inside the api container
	$(COMPOSE) exec api alembic upgrade head

lint: ## Lint api and web
	$(COMPOSE) exec api ruff check .
	$(COMPOSE) exec web npm run lint

test: ## Run api and web tests
	$(COMPOSE) exec api pytest -q
	$(COMPOSE) exec web npm test

fmt: ## Auto-format api and web
	$(COMPOSE) exec api ruff format .
	$(COMPOSE) exec web npm run format
