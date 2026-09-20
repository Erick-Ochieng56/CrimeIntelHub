#!/usr/bin/env bash
# Prepare OSM extract for local OSRM (low-RAM friendly by default).
#
# Default: Nairobi metro clip (~30 MB) — works with ~2 GB Docker memory.
# Full Kenya (~335 MB PBF): needs ~4+ GB Docker RAM for osrm-extract.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="${ROOT}/data/osrm"
URL="${OSRM_PBF_URL:-https://download.geofabrik.de/africa/kenya-latest.osm.pbf}"
MODE="${1:-nairobi}" # nairobi | kenya

mkdir -p "${DIR}"

if [[ -f "${DIR}/kenya-latest.osrm.mldgr" ]]; then
  echo "OSRM graph already built in ${DIR}"
  exit 0
fi

download_kenya() {
  if [[ -f "${DIR}/kenya-full.osm.pbf" ]]; then
    echo "Full Kenya PBF present: ${DIR}/kenya-full.osm.pbf"
    return 0
  fi
  if [[ -f "${DIR}/kenya-latest.osm.pbf" ]] && [[ $(stat -c%s "${DIR}/kenya-latest.osm.pbf") -gt 100000000 ]]; then
    mv "${DIR}/kenya-latest.osm.pbf" "${DIR}/kenya-full.osm.pbf"
    echo "Moved existing large extract to kenya-full.osm.pbf"
    return 0
  fi
  echo "Downloading full Kenya extract (~300–350 MB)…"
  curl -fL --retry 5 --retry-delay 5 -o "${DIR}/kenya-full.osm.pbf.partial" "${URL}"
  mv "${DIR}/kenya-full.osm.pbf.partial" "${DIR}/kenya-full.osm.pbf"
}

clip_nairobi() {
  local venv="${ROOT}/.venv-osrm"
  if [[ ! -x "${venv}/bin/python" ]]; then
    python3 -m venv "${venv}"
    "${venv}/bin/pip" install -q osmium
  fi
  echo "Clipping Nairobi metro bbox from kenya-full.osm.pbf (several minutes)…"
  "${venv}/bin/python" - <<'PY'
import osmium, os, time
root = os.environ["ROOT"]
src = os.path.join(root, "data/osrm/kenya-full.osm.pbf")
dst = os.path.join(root, "data/osrm/nairobi-metro.osm.pbf")
idx = os.path.join("/tmp", "nairobi-nodes.idx")
MIN_LON, MIN_LAT = 36.60, -1.45
MAX_LON, MAX_LAT = 37.10, -1.10

class Handler(osmium.SimpleHandler):
    def __init__(self, writer):
        super().__init__()
        self.writer = writer
        self.nodes = self.ways = 0
        self.t0 = time.time()
    def node(self, n):
        if MIN_LON <= n.location.lon <= MAX_LON and MIN_LAT <= n.location.lat <= MAX_LAT:
            self.writer.add_node(n)
            self.nodes += 1
    def way(self, w):
        try:
            locs = [n.location for n in w.nodes if n.location.valid()]
        except Exception:
            return
        if locs and any(MIN_LON <= loc.lon <= MAX_LON and MIN_LAT <= loc.lat <= MAX_LAT for loc in locs):
            self.writer.add_way(w)
            self.ways += 1
    def relation(self, r):
        if any(t.k == "type" and t.v == "restriction" for t in r.tags):
            self.writer.add_relation(r)

writer = osmium.SimpleWriter(dst)
h = Handler(writer)
h.apply_file(src, locations=True, idx=f"sparse_file_array,{idx}")
writer.close()
print(f"Wrote {dst} nodes={h.nodes} ways={h.ways} mb={os.path.getsize(dst)/1e6:.1f}")
PY
  cp -f "${DIR}/nairobi-metro.osm.pbf" "${DIR}/kenya-latest.osm.pbf"
}

case "${MODE}" in
  nairobi)
    download_kenya
    if [[ ! -f "${DIR}/nairobi-metro.osm.pbf" ]]; then
      ROOT="${ROOT}" clip_nairobi
    else
      cp -f "${DIR}/nairobi-metro.osm.pbf" "${DIR}/kenya-latest.osm.pbf"
      echo "Using existing Nairobi metro clip"
    fi
    echo "Ready. Start OSRM: docker compose --profile routing up -d osrm"
    echo "Note: routes only work inside Nairobi metro bbox on low-RAM setups."
    ;;
  kenya)
    download_kenya
    cp -f "${DIR}/kenya-full.osm.pbf" "${DIR}/kenya-latest.osm.pbf"
    echo "Ready for full Kenya. Ensure Docker Desktop has ≥4 GB RAM, then:"
    echo "  docker compose --profile routing up -d osrm"
    ;;
  *)
    echo "Usage: $0 [nairobi|kenya]" >&2
    exit 1
    ;;
esac
