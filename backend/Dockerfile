# Unified GIS runtime for local + production (Linux).
# Avoids Windows GDAL wheels entirely — same image everywhere.
# Builder compiles wheels; the final image keeps runtime shared libraries only.

FROM python:3.11-slim-trixie AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libgdal-dev \
        libgeos-dev \
        libproj-dev \
        build-essential \
        libpq-dev \
        g++ \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt


FROM python:3.11-slim-trixie

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=crime_analysis.settings

WORKDIR /app

# Runtime GIS + Postgres client. GeoDjango loads libgdal via ctypes (no osgeo package).
# Debian trixie ships GDAL 3.10 (Django's gis.W001 check wants 3.9+), GEOS 3.13, PROJ 9.6.
# gdal-bin pulls in the matching libgdal, libgeos-c and libproj runtime libraries.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        gdal-bin \
        libpq5 \
        postgresql-client \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Non-secret build-time defaults. SECRET_KEY, DB_USER and DB_PASSWORD are not baked
# into the image; they must come from the runtime environment (docker compose / .env).
# No build step imports Django, so the build does not need them.
ARG REDIS_URL=redis://localhost:6379/0
ARG DB_NAME=crime_analysis_db
ARG DB_HOST=localhost
ARG DEBUG=True
ENV REDIS_URL=$REDIS_URL \
    DB_NAME=$DB_NAME \
    DB_HOST=$DB_HOST \
    DEBUG=$DEBUG

COPY --from=builder /wheels /wheels
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir --no-index --find-links=/wheels -r requirements.txt \
    && rm -rf /wheels

COPY . .
RUN mkdir -p logs media staticfiles \
    && sed -i 's/\r$//' docker-entrypoint.sh \
    && chmod +x docker-entrypoint.sh

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health/ || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
# "web" starts gunicorn (or Django's dev server when DJANGO_DEV_SERVER=1); see docker-entrypoint.sh
CMD ["web"]
