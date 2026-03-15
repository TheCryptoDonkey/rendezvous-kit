# Self-Hosting a Routing Engine

rendezvous-kit is engine-agnostic — it works with any routing service that can compute isochrones and route matrices. This guide covers self-hosting options so you can run the full pipeline without third-party API keys or rate limits.

## Quick Comparison

| Engine | Isochrone | Route Matrix | Docker image | Typical RAM | Setup effort |
|--------|:---------:|:------------:|--------------|-------------|--------------|
| Valhalla | Yes | Yes | `ghcr.io/gis-ops/docker-valhalla` | 2–8 GB | Medium |
| OSRM | No | Yes | `osrm/osrm-backend` | 1–4 GB | Low |
| GraphHopper | Yes | Yes | `graphhopper/graphhopper` | 2–6 GB | Low |

**Recommendation:** Valhalla is the best all-round choice — it supports isochrones, route matrices, and turn-by-turn routing. OSRM is lighter but cannot compute isochrones, so you would need to supply your own intersection polygon or pair it with another engine.

## Valhalla (Recommended)

The easiest way to run Valhalla is with the [GIS-OPS Docker image](https://github.com/gis-ops/docker-valhalla):

```bash
docker run -d --name valhalla \
  -p 8002:8002 \
  -e tile_urls=https://download.geofabrik.de/europe/great-britain-latest.osm.pbf \
  -v valhalla_data:/custom_files \
  ghcr.io/gis-ops/docker-valhalla/valhalla:latest
```

The first run downloads and builds routing tiles — this can take 10–60 minutes depending on the region size. Subsequent starts are fast.

**Use in rendezvous-kit:**

```typescript
import { ValhallaEngine } from 'rendezvous-kit/engines/valhalla'

const engine = new ValhallaEngine({ baseUrl: 'http://localhost:8002' })
```

### Choosing a Region

Download `.osm.pbf` extracts from [Geofabrik](https://download.geofabrik.de/). Smaller regions use less RAM and build faster:

- `great-britain-latest.osm.pbf` — ~1.2 GB, builds in ~15 min, ~4 GB RAM
- `europe-latest.osm.pbf` — ~28 GB, builds in hours, ~16 GB RAM
- Country-level extracts are a good compromise

### Multiple Regions

To cover multiple non-contiguous regions, download separate extracts and merge them with [Osmium](https://osmcode.org/osmium-tool/):

```bash
osmium merge england.osm.pbf scotland.osm.pbf wales.osm.pbf -o gb.osm.pbf
```

## OSRM

OSRM is fast and lightweight but only supports route matrices — no isochrones.

```bash
# Download and prepare data
wget https://download.geofabrik.de/europe/great-britain-latest.osm.pbf
docker run -t -v $(pwd):/data osrm/osrm-backend osrm-extract -p /opt/car.lua /data/great-britain-latest.osm.pbf
docker run -t -v $(pwd):/data osrm/osrm-backend osrm-partition /data/great-britain-latest.osrm
docker run -t -v $(pwd):/data osrm/osrm-backend osrm-customize /data/great-britain-latest.osrm

# Run the server
docker run -d --name osrm \
  -p 5000:5000 \
  -v $(pwd):/data \
  osrm/osrm-backend osrm-routed --algorithm mld /data/great-britain-latest.osrm
```

**Use in rendezvous-kit:**

```typescript
import { OsrmEngine } from 'rendezvous-kit/engines/osrm'

const engine = new OsrmEngine({ baseUrl: 'http://localhost:5000' })
// Note: OSRM cannot compute isochrones — findRendezvous will throw.
// Use OSRM for computeRouteMatrix only.
```

## GraphHopper

GraphHopper supports isochrones and route matrices. The open-source version is free to self-host.

```bash
docker run -d --name graphhopper \
  -p 8989:8989 \
  -e JAVA_OPTS="-Xmx4g" \
  -v graphhopper_data:/data \
  graphhopper/graphhopper:latest \
  --url https://download.geofabrik.de/europe/great-britain-latest.osm.pbf \
  --host 0.0.0.0
```

**Use in rendezvous-kit:**

```typescript
import { GraphHopperEngine } from 'rendezvous-kit/engines/graphhopper'

const engine = new GraphHopperEngine({ baseUrl: 'http://localhost:8989' })
```

## Cloud-Hosted Alternatives

If you prefer not to self-host:

- **OpenRouteService** — free API key from [openrouteservice.org](https://openrouteservice.org/dev/), rate-limited (40 requests/min on free tier)
- **Trotters Routing** — `https://routing.trotters.cc`, L402-gated (pay-per-request with Lightning)

```typescript
import { OpenRouteServiceEngine } from 'rendezvous-kit/engines/openrouteservice'

const engine = new OpenRouteServiceEngine({ apiKey: 'your-api-key' })
```

## Tips

- **Start with a small region** while developing — city or country level. You can always upgrade later.
- **Pin the PBF date** in production so tile rebuilds are reproducible.
- **Monitor memory** — routing engines are memory-hungry. Valhalla with GB data uses ~4 GB RAM.
- **Health checks** — all engines respond to `GET /` or similar. Add a health check to your Docker Compose or Kubernetes config.
