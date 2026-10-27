#!/usr/bin/env bash
# End-to-End-Test gegen ein lokales Supabase (Docker) mit Mocks für Strava und die Claude API.
# Nur für Entwicklungsumgebungen mit Docker (z. B. Claude Code). Die Betreiberin braucht das nicht.
# Ablauf: Supabase starten (Migrationen + Seed), App bauen und starten, Szenarien A–D ausführen.
set -euo pipefail
E2E="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$E2E/.." && pwd)"
WORK="$E2E/.state/supabase-projekt"
mkdir -p "$E2E/.state/shots" "$WORK"
rm -f "$E2E/.state/mock-requests.log"

# 1) Supabase-Projekt mit unseren Migrationen, Seed und der Login-Mail-Vorlage aus README_SETUP.md
cd "$WORK"
[ -f supabase/config.toml ] || npx --yes supabase init --force >/dev/null
rm -rf supabase/migrations supabase/seed.sql && cp -r "$ROOT/supabase/migrations" "$ROOT/supabase/seed.sql" supabase/
mkdir -p supabase/templates
python3 - "$ROOT/README_SETUP.md" <<'PY'
import re, sys
html = re.search(r"```html\n(.*?)```", open(sys.argv[1]).read(), re.S).group(1)
open("supabase/templates/magic_link.html", "w").write(html)
c = open("supabase/config.toml").read()
c = re.sub(r"(?m)^enable_signup = true", "enable_signup = false", c, count=1)
c = re.sub(r"(?m)^email_sent = \d+", "email_sent = 200", c)
if "[auth.email.template.magic_link]" not in c:
    c += '\n[auth.email.template.magic_link]\nsubject = "Dein Login für PT-Coach"\ncontent_path = "./supabase/templates/magic_link.html"\n'
open("supabase/config.toml", "w").write(c)
PY
npx supabase stop >/dev/null 2>&1 || true
npx supabase start -x studio,imgproxy,edge-runtime,logflare,vector,supavisor,storage-api,postgres-meta >/dev/null
eval "$(npx supabase status -o env | grep -E '^(ANON_KEY|SERVICE_ROLE_KEY)=')"

# 2) Mock-Server (Strava + Claude) und App
node "$E2E/mock.mjs" > "$E2E/.state/mock.out" 2>&1 &
MOCK=$!
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY" SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
export NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000 COACH_EMAIL=coach@example.com
export ANTHROPIC_API_KEY=mock-key ANTHROPIC_BASE_URL=http://127.0.0.1:4010
export STRAVA_CLIENT_ID=123 STRAVA_CLIENT_SECRET=mock-secret STRAVA_WEBHOOK_VERIFY_TOKEN=verify-me STRAVA_API_BASE=http://127.0.0.1:4010
export NO_PROXY=127.0.0.1,localhost no_proxy=127.0.0.1,localhost
cd "$ROOT" && npm run build >/dev/null
npx next start -H 127.0.0.1 -p 3000 > "$E2E/.state/next.log" 2>&1 &
APP=$!
trap 'kill $APP $MOCK 2>/dev/null || true' EXIT
sleep 5

# 3) Szenarien
cd "$E2E"
for s in szenario-a-coach szenario-b-kunde szenario-c-strava-chat szenario-d-plan-versionen; do
  echo "== $s"
  node "$s.mjs"
done
echo "Screenshots: $E2E/.state/shots"
