#!/usr/bin/env bash
# Stage Radar — security self-audit.
# Acts as an ATTACKER who only has your public anon key (from docs/config.js) and tries to
# read your data anonymously. If RLS is set up correctly, every table returns 0 rows or an
# error. Any table that returns real rows is a LEAK you must fix.
#
# Usage:
#   bash supabase/security_check.sh "<SUPABASE_URL>" "<ANON_KEY>"
# e.g.
#   bash supabase/security_check.sh "https://lpacanurfbnkqrfrlwcd.supabase.co" "sb_publishable_xxx"

set -u
URL="${1:?Pass your Supabase URL as arg 1}"
KEY="${2:?Pass your anon (publishable) key as arg 2}"
URL="${URL%/}"
H=(-s -H "apikey: ${KEY}" -H "Authorization: Bearer ${KEY}")
pass=0; leak=0

probe() {  # name  path
  local name="$1" path="$2"
  local body; body="$(curl "${H[@]}" -m 20 "${URL}/rest/v1/${path}" 2>/dev/null)"
  # a successful anonymous SELECT returns a JSON array with at least one object
  if printf '%s' "$body" | grep -Eq '^\s*\[\s*\{'; then
    echo "  ❌ LEAK   ${name}: anonymous read returned data"
    printf '           %s\n' "$(printf '%s' "$body" | cut -c1-160)"
    leak=$((leak+1))
  else
    echo "  ✅ ok     ${name}: no data ($(printf '%s' "$body" | cut -c1-80))"
    pass=$((pass+1))
  fi
}

echo "Target: ${URL}"
echo "Probing as an anonymous visitor (public key only)…"
echo
echo "Tables (expected: no data):"
probe "offers"        "offers?select=*&limit=3"
probe "profiles"      "profiles?select=*&limit=3"
probe "applications"  "applications?select=*&limit=3"   # friends' private notes/letters
probe "invites"       "invites?select=*&limit=3"
probe "scrape_runs"   "scrape_runs?select=*&limit=3"

echo
echo "Privileged RPCs (expected: error, not data):"
probe "admin_users"   "rpc/admin_users"
probe "my_matches"    "rpc/my_matches"

echo
echo "Storage — CV bucket must be PRIVATE:"
cv="$(curl "${H[@]}" -m 20 "${URL}/storage/v1/object/list/cvs" -X POST -H 'Content-Type: application/json' -d '{"prefix":"","limit":100}' 2>/dev/null)"
if printf '%s' "$cv" | grep -Eq '"name"\s*:'; then
  echo "  ❌ LEAK   anonymous listing of the cvs bucket returned files"
  leak=$((leak+1))
else
  echo "  ✅ ok     cvs bucket not listable anonymously"
  pass=$((pass+1))
fi

echo
echo "────────────────────────────────────────────"
if [ "$leak" -eq 0 ]; then
  echo "RESULT: ✅ ${pass} checks passed, no anonymous data access. RLS is doing its job."
else
  echo "RESULT: ❌ ${leak} LEAK(S) found — fix before inviting anyone (see README › Sécurité)."
  exit 1
fi
