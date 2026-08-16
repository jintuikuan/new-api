#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
cd "$ROOT_DIR"

BASE_COMPOSE=${BASE_COMPOSE:-docker-compose.yml}
CUSTOM_COMPOSE=${CUSTOM_COMPOSE:-docker-compose.custom.yml}
BACKUP_DIR=${BACKUP_DIR:-backups}
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  echo "Docker Compose is not installed." >&2
  exit 1
fi

for file in "$BASE_COMPOSE" "$CUSTOM_COMPOSE"; do
  if [[ ! -f "$file" ]]; then
    echo "Missing Compose file: $file" >&2
    exit 1
  fi
done

compose() {
  "${COMPOSE[@]}" -f "$BASE_COMPOSE" -f "$CUSTOM_COMPOSE" "$@"
}

mkdir -p "$BACKUP_DIR"

old_container=$(compose ps -q new-api 2>/dev/null || true)
old_image=""
rollback_tag=""
if [[ -n "$old_container" ]]; then
  old_image=$(docker inspect --format '{{.Image}}' "$old_container" 2>/dev/null || true)
fi

echo "Pulling the new application image..."
compose pull new-api

postgres_container=$(compose ps -q postgres 2>/dev/null || true)
if [[ -n "$postgres_container" ]] && [[ "$(docker inspect --format '{{.State.Running}}' "$postgres_container")" == "true" ]]; then
  echo "Backing up PostgreSQL..."
  compose exec -T postgres sh -ec \
    'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --clean --if-exists' \
    > "$BACKUP_DIR/postgres-$TIMESTAMP.sql"
fi

if [[ -n "$old_image" ]]; then
  rollback_tag="new-api:rollback-$TIMESTAMP"
  docker tag "$old_image" "$rollback_tag"
fi

rollback() {
  local exit_code=$?
  trap - ERR
  echo "Update failed; restoring the previous application container..." >&2
  if [[ -n "$rollback_tag" ]]; then
    NEW_API_IMAGE="$rollback_tag" compose up -d --no-deps --force-recreate new-api || true
  else
    compose start new-api || true
  fi
  exit "$exit_code"
}
trap rollback ERR

echo "Stopping the application for a consistent data-directory backup..."
compose stop new-api >/dev/null

if [[ -d data ]]; then
  echo "Backing up ./data..."
  tar -czf "$BACKUP_DIR/data-$TIMESTAMP.tar.gz" data
fi

echo "Recreating only the new-api service..."
compose up -d --no-deps --force-recreate new-api

echo "Waiting for the application health check..."
for _ in {1..24}; do
  container=$(compose ps -q new-api)
  status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container")
  if [[ "$status" == "healthy" ]] || [[ "$status" == "running" ]]; then
    trap - ERR
    echo "Update completed. Backup files are in $BACKUP_DIR/."
    exit 0
  fi
  if [[ "$status" == "unhealthy" ]] || [[ "$status" == "exited" ]] || [[ "$status" == "dead" ]]; then
    false
  fi
  sleep 5
done

echo "Health check timed out." >&2
false
