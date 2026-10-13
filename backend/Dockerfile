# Unified GIS runtime for local + production (Linux).
# Avoids Windows GDAL wheels entirely — same image everywhere.
# Builder compiles wheels; the final image keeps runtime shared libraries only.

FROM python:3.11-slim-bookworm AS builder

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


FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=crime_analysis.settings

WORKDIR /app

# Runtime GIS + Postgres client. GeoDjango loads libgdal via ctypes (no osgeo package).
# Bookworm names: libgdal32, libgeos-c1v5, libproj25, libpq5.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        gdal-bin \
        libgdal32 \
        libgeos-c1v5 \
        libproj25 \
        libpq5 \
        postgresql-client \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Build-time env so Django can import during image build if needed
ARG SECRET_KEY=build-only-not-for-runtime
ARG REDIS_URL=redis://localhost:6379/0
ARG DB_NAME=crime_analysis_db
ARG DB_USER=crime_analysis_user
ARG DB_PASSWORD=crime_analysis_password
ARG DB_HOST=localhost
ARG DEBUG=True
ENV SECRET_KEY=$SECRET_KEY \
    REDIS_URL=$REDIS_URL \
    DB_NAME=$DB_NAME \
    DB_USER=$DB_USER \
    DB_PASSWORD=$DB_PASSWORD \
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
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "1", "--timeout", "120", "crime_analysis.wsgi:application"]
