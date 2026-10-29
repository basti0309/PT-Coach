#!/usr/bin/env bash
# Nur für die Entwicklungsumgebung (Claude Code): startet ein lokales Postgres,
# legt eine Supabase-Attrappe an (auth.users, auth.uid(), Rollen, Publication),
# führt alle Migrationen, die Seeds und supabase/tests/rls_test.sql aus.
# Die Betreiberin braucht dieses Skript nicht.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
DATA="${TMPDIR:-/tmp}/ptcoach-pg"
PORT="${PGPORT_TEST:-55432}"
RUNAS=""
if [ "$(id -u)" = "0" ]; then RUNAS="sudo -u postgres"; fi

$RUNAS "$PGBIN/pg_ctl" -D "$DATA" stop -m fast >/dev/null 2>&1 || true
rm -rf "$DATA"; mkdir -p "$DATA"; [ -n "$RUNAS" ] && chown postgres "$DATA"
$RUNAS "$PGBIN/initdb" -D "$DATA" -U postgres >/dev/null
$RUNAS "$PGBIN/pg_ctl" -D "$DATA" -o "-p $PORT -k /tmp" -l "$DATA/log" start >/dev/null
trap '$RUNAS "$PGBIN/pg_ctl" -D "$DATA" stop -m fast >/dev/null 2>&1 || true' EXIT

PSQL=(psql -h /tmp -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q -d postgres)
"${PSQL[@]}" -f "$ROOT/scripts/supabase-attrappe.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "Migration: $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done
echo "Seed"
"${PSQL[@]}" -f "$ROOT/supabase/seed.sql"
echo "Seed: Demo-Personas (zweimal, muss wiederholbar sein)"
"${PSQL[@]}" -f "$ROOT/supabase/seed_personas.sql"
"${PSQL[@]}" -f "$ROOT/supabase/seed_personas.sql"
echo "Migrationen ein zweites Mal? (nicht vorgesehen, übersprungen)"
echo "RLS-Tests"
OUT="$("${PSQL[@]}" -A -F ' | ' -f "$ROOT/supabase/tests/rls_test.sql")"
echo "$OUT"
if echo "$OUT" | grep -q "FEHLER"; then echo "RLS-Tests fehlgeschlagen"; exit 1; fi
echo "$OUT" | grep -q "ALLE TESTS BESTANDEN" || { echo "Kein Abschluss-Ergebnis gefunden"; exit 1; }
