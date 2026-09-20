#!/bin/sh
# Download Kenya OSM extract once into the shared osrm_data volume.
set -eu

DATA_DIR="${OSRM_DATA_DIR:-/data}"
NAME="${OSRM_REGION_NAME:-kenya-latest}"
PBF_URL="${OSRM_PBF_URL:-https://download.geofabrik.de/africa/kenya-latest.osm.pbf}"
PBF_FILE="${DATA_DIR}/${NAME}.osm.pbf"
READY_MARKER="${DATA_DIR}/${NAME}.osrm.mldgr"

mkdir -p "${DATA_DIR}"

if [ -f "${READY_MARKER}" ]; then
  echo "[osrm-download] Graph already built — skip download."
  exit 0
fi

if [ -f "${PBF_FILE}" ]; then
  echo "[osrm-download] PBF already present — skip download."
  exit 0
fi

echo "[osrm-download] Downloading Kenya extract (~100–200 MB)…"
curl -fL --retry 5 --retry-delay 5 -o "${PBF_FILE}.partial" "${PBF_URL}"
mv "${PBF_FILE}.partial" "${PBF_FILE}"
echo "[osrm-download] Saved ${PBF_FILE}"
