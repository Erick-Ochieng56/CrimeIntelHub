#!/bin/sh
set -e

echo "Waiting for Postgres at ${DB_HOST}:${DB_PORT:-5432}..."
until pg_isready -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USER}" -d "${DB_NAME}" > /dev/null 2>&1; do
  sleep 1
done
echo "Postgres is ready."

# The web container migrates; the Celery worker and beat set RUN_MIGRATIONS=0
if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
  echo "Running migrations..."
  python manage.py migrate --noinput

  echo "Ensuring auth groups exist..."
  python manage.py create_auth_groups || true
fi

if [ "${RUN_COLLECTSTATIC:-1}" = "1" ]; then
  echo "Collecting static files..."
  python manage.py collectstatic --noinput
fi

# "web" is the HTTP server. Production uses gunicorn; DJANGO_DEV_SERVER=1 switches to
# Django's dev server for local work. Any other command (celery etc.) runs as given.
if [ "${1:-web}" = "web" ]; then
  if [ "${DJANGO_DEV_SERVER:-0}" = "1" ]; then
    set -- python manage.py runserver 0.0.0.0:8000 --noreload
  else
    set -- gunicorn crime_analysis.wsgi:application \
      --bind "0.0.0.0:8000" \
      --workers "${GUNICORN_WORKERS:-3}" \
      --threads "${GUNICORN_THREADS:-2}" \
      --timeout "${GUNICORN_TIMEOUT:-120}" \
      --graceful-timeout "${GUNICORN_GRACEFUL_TIMEOUT:-30}" \
      --max-requests "${GUNICORN_MAX_REQUESTS:-1000}" \
      --max-requests-jitter "${GUNICORN_MAX_REQUESTS_JITTER:-100}" \
      --log-level "${GUNICORN_LOG_LEVEL:-info}" \
      --access-logfile - \
      --error-logfile -
  fi
fi

echo "Starting: $*"
exec "$@"
