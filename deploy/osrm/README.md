# Optional OSRM routing

```bash
# Prepare extract (Nairobi metro by default — low Docker RAM)
./scripts/download-osrm-kenya.sh

# Or full Kenya (needs ≥4 GB Docker memory for extract):
# ./scripts/download-osrm-kenya.sh kenya

docker compose --profile routing up -d osrm
```

Data lives in `data/osrm/` (gitignored). Backend proxies at `GET /api/maps/route/?origin=lat,lng&destination=lat,lng`.
