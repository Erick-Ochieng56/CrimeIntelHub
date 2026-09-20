# Unified GIS runtime for local + production (Linux).
# Avoids Windows GDAL wheels entirely — same image everywhere.
FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=crime_analysis.settings

WORKDIR /app

# System GIS + Postgres client (GDAL/GEOS/PROJ for GeoDjango)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        gdal-bin \
        libgdal-dev \
        libgeos-dev \
        libproj-dev \
        postgresql-client \
        build-essential \
        libpq-dev \
        curl \
        g++ \
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

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir "GDAL==$(gdal-config --version)"

COPY . .
RUN mkdir -p logs media staticfiles \
    && sed -i 's/\r$//' docker-entrypoint.sh \
    && chmod +x docker-entrypoint.sh

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health/ || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "120", "crime_analysis.wsgi:application"]
