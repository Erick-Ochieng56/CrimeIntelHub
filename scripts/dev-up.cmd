@echo off
REM Start CrimeIntelHub with Docker (GIS included — no Windows GDAL)
cd /d "%~dp0.."
docker compose up --build %*
