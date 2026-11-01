#!/usr/bin/env bash
# Applies the migrations to a scratch database and runs the SQL tests. Needs a local Postgres you can
# reach with psql (PG* environment variables or the defaults); the database is dropped afterwards.
set -euo pipefail
cd "$(dirname "$0")/.."
DB="vcseed_test_$$"
createdb "$DB"
trap 'dropdb --if-exists "$DB"' EXIT
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f tests/supabase_stub.sql
for f in migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f"; done
for f in tests/*_test.sql; do psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f"; done

# The generated demo seed loads cleanly on a fresh database.
SEED_DB="${DB}_seed"
createdb "$SEED_DB"
trap 'dropdb --if-exists "$DB"; dropdb --if-exists "$SEED_DB"' EXIT
psql -q -v ON_ERROR_STOP=1 -d "$SEED_DB" -f tests/supabase_stub.sql
for f in migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 -d "$SEED_DB" -f "$f"; done
psql -q -v ON_ERROR_STOP=1 -d "$SEED_DB" -f seed.sql
psql -q -v ON_ERROR_STOP=1 -d "$SEED_DB" -f tests/seed_check.sql
