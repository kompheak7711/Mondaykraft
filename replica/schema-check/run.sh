#!/bin/sh
# Spins up postgres:17 in Docker, loads the Supabase schema stubs, replica/schema.sql, the grants and the smoke test.
# Usage: replica/schema-check/run.sh   (needs Docker; ends with SMOKE PASSED or the first failing check)
set -e
DIR=$(cd "$(dirname "$0")" && pwd)
SCHEMA=${1:-$DIR/../schema.sql}
docker rm -f tk-pgcheck >/dev/null 2>&1 || true
docker run -d --name tk-pgcheck -e POSTGRES_PASSWORD=pw -e POSTGRES_DB=tk -p 54329:5432 postgres:17 >/dev/null
for i in $(seq 1 30); do docker exec tk-pgcheck pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done
run() { docker exec -i tk-pgcheck psql -v ON_ERROR_STOP=1 -q -U postgres -d tk -f - < "$1" 2>&1 | grep -v -E '^(SET|CREATE|ALTER|GRANT|INSERT|NOTICE|DO|psql:.*NOTICE)' || true; }
echo "== prelude"; run "$DIR/prelude.sql"
echo "== schema"; run "$SCHEMA"; echo "== postlude"; run "$DIR/postlude.sql"
if [ -f "$DIR/smoke.sql" ]; then echo "== smoke"; run "$DIR/smoke.sql"; fi
