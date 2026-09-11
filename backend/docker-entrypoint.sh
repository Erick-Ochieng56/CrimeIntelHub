#!/bin/sh
set -e

echo "Waiting for Postgres at ${DB_HOST}:${DB_PORT:-5432}..."
until pg_isready -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USER}" -d "${DB_NAME}" > /dev/null 2>&1; do
  sleep 1
done
echo "Postgres is ready."

echo "Running migrations..."
python manage.py migrate --noinput

echo "Ensuring auth groups exist..."
python manage.py create_auth_groups || true

if [ "${RUN_COLLECTSTATIC:-1}" = "1" ]; then
  echo "Collecting static files..."
  python manage.py collectstatic --noinput
fi

echo "Starting: $*"
exec "$@"
