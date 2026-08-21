#!/usr/bin/env sh
# Apply schema + seed to production Postgres (DATABASE_URL).
# Usage (from repo root): ./db/seed-prod.sh [--yes]

set -eu

ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT}/.env"
YES=0

for arg in "$@"; do
  case "$arg" in
    --yes|-y) YES=1 ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Usage: $0 [--yes]" >&2
      exit 1
      ;;
  esac
done

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set. Add it to .env or the environment." >&2
  echo "See .env.example. This script never uses the local Docker db." >&2
  exit 1
fi

redacted=$(printf '%s' "$DATABASE_URL" | sed 's#://[^:/@]*:[^@]*@#://***:***@#')

echo "This will apply schema + demo seed to:"
echo "  $redacted"
echo "It clears stock_prices and resets curated stocks to pending."

if [ "$YES" -ne 1 ]; then
  if [ ! -t 0 ]; then
    echo "Non-interactive stdin: pass --yes to confirm." >&2
    exit 1
  fi
  printf "Type 'reseed' to continue: "
  read -r confirm
  if [ "$confirm" != "reseed" ]; then
    echo "Aborted."
    exit 1
  fi
fi

SEED_DATABASE_URL="$DATABASE_URL" exec "$ROOT/db/seed.sh"
