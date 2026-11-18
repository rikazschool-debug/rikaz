#!/usr/bin/env bash
# Spins up a throwaway local Postgres in /tmp, loads the stub schema + platform functions + migration, runs the tests.
# Never point this at production: it refuses to run if PGHOST is set to anything but the temp socket.
set -euo pipefail
cd "$(dirname "$0")"
DIR=$(mktemp -d /tmp/idl-pg.XXXX)
initdb -D "$DIR/data" -A trust -U postgres >/dev/null
pg_ctl -D "$DIR/data" -o "-k $DIR -c listen_addresses=''" -l "$DIR/log" start >/dev/null
trap 'pg_ctl -D "$DIR/data" stop -m fast >/dev/null' EXIT
export PGHOST=$DIR PGUSER=postgres PGDATABASE=postgres
P="psql -X -q -v ON_ERROR_STOP=1"
$P -f fixtures/stub_schema.sql
$P -f fixtures/platform_functions.sql
$P -f ../supabase/migrations/20261119090000_guardian_id_first_login.sql
$P -t -f guardian_activation.test.sql 2>&1 | grep -E "PASS|FAIL|ERROR"
bash concurrency.sh
echo "--- rollback check"
$P -f ../supabase/rollback/20261119090000_guardian_id_first_login.down.sql
$P -t -A -c "select count(*) from pg_proc where proname='_idl_resolve_staged_guardian'" | grep -qx 0 && echo "PASS: rollback restores original functions"
