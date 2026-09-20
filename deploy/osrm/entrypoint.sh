#!/usr/bin/env bash
# Build OSRM graph from Kenya PBF (downloaded by osrm-download service) and serve.
set -euo pipefail

DATA_DIR="${OSRM_DATA_DIR:-/data}"
NAME="${OSRM_REGION_NAME:-kenya-latest}"
PBF_FILE="${DATA_DIR}/${NAME}.osm.pbf"
READY_MARKER="${DATA_DIR}/${NAME}.osrm.mldgr"

mkdir -p "${DATA_DIR}"
cd "${DATA_DIR}"

if [[ ! -f "${READY_MARKER}" ]]; then
  if [[ ! -f "${PBF_FILE}" ]]; then
    echo "[osrm] ERROR: missing ${PBF_FILE}. Run the osrm-download service first." >&2
    exit 1
  fi
  echo "[osrm] Extracting road network (several minutes on first run)…"
  osrm-extract -p /opt/car.lua "${PBF_FILE}"
  echo "[osrm] Partitioning…"
  osrm-partition "${DATA_DIR}/${NAME}.osrm"
  echo "[osrm] Customizing…"
  osrm-customize "${DATA_DIR}/${NAME}.osrm"
  echo "[osrm] Graph ready."
else
  echo "[osrm] Using existing Kenya graph in ${DATA_DIR}"
fi

echo "[osrm] Starting osrm-routed on :5000"
exec osrm-routed --algorithm mld --ip 0.0.0.0 --port 5000 "${DATA_DIR}/${NAME}.osrm"
