#!/bin/sh
set -e

# Optional migrations at container start. Enable with RUN_MIGRATIONS=true.
if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "Running database migrations..."
  alembic upgrade head
else
  echo "Skipping database migrations (RUN_MIGRATIONS=false)."
fi

echo "Starting API server..."
exec "$@"
