-- AreaScan database bootstrap
-- Runs once on first container start via /docker-entrypoint-initdb.d.
-- Application schema/tables are managed by Alembic migrations (apps/api), not here.
-- This file only enables the required PostgreSQL extensions.

CREATE EXTENSION IF NOT EXISTS postgis;    -- spatial types & geo queries
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- trigram fuzzy text search
CREATE EXTENSION IF NOT EXISTS citext;     -- case-insensitive text (emails, etc.)
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid(), crypto helpers
