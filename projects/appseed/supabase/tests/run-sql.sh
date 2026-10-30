#!/usr/bin/env bash
# Applies the migrations to a scratch database and runs the SQL tests. Needs a local Postgres you can
# reach with psql (PG* environment variables or the defaults); the database is dropped afterwards.
set -euo pipefail
cd "$(dirname "$0")/.."
DB="appseed_test_$$"
createdb "$DB"
trap 'dropdb --if-exists "$DB"' EXIT
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f tests/supabase_stub.sql
for f in migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f"; done
for f in tests/*_test.sql; do psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f"; done
