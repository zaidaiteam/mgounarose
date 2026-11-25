#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
root=$PWD
engine=${DOCKER_HOST:-$(docker context inspect --format '{{.Endpoints.docker.Host}}')}
case "$engine" in unix://*|npipe://*) ;; *) echo "Only a local container engine is supported." >&2; exit 2 ;; esac
docker info --format '{{.ServerVersion}}' >/dev/null
command -v supabase >/dev/null
mkdir -p work
sandbox=$(mktemp -d "$root/work/v031-supabase.XXXXXX")
stack=$(basename "$sandbox" | tr '[:upper:]' '[:lower:]' | tr '.' '-')
mkdir -p "$sandbox/supabase/migrations" "$sandbox/supabase/templates"
sed "s/rose-v031-local/$stack/" tests/supabase/config.toml > "$sandbox/supabase/config.toml"
sed -n '/^create schema rose_care;/,$p' tests/fixtures/rose-baseline.sql > "$sandbox/supabase/migrations/20261125000000_fixture_baseline.sql"
cp supabase/migrations/*.sql "$sandbox/supabase/migrations/"
cp supabase/templates/*.html "$sandbox/supabase/templates/"
cleanup() { (cd "$sandbox" && supabase stop --no-backup) || true; }
trap cleanup EXIT
(cd "$sandbox" && supabase start -x studio,realtime,edge-runtime,logflare,vector,supavisor,postgres-meta,imgproxy >/dev/null)
status=$(cd "$sandbox" && supabase status -o json)
printf '%s' "$status" | node tests/supabase/seed.mjs
