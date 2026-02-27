# Security Policy

## Network Calls

rendezvous-kit makes outbound HTTP requests to:

- **Your routing engine** (Valhalla, ORS, GraphHopper, or OSRM) — the URL you configure
- **Overpass API** (`https://overpass-api.de/api/interpreter`) — for venue search

No data is sent to any other service. There is no telemetry, analytics, or tracking.

## API Keys

- **OpenRouteService** requires an API key, passed via the constructor. Keep it out of client-side bundles.
- **Valhalla, OSRM** are self-hosted and require no API key.
- **GraphHopper** API key is optional (only needed for the cloud service).

## Reporting a Vulnerability

If you discover a security vulnerability, please email **security@trotters.cc** rather than opening a public issue. We will respond within 48 hours.

## Supported Versions

Only the latest major version receives security fixes.
