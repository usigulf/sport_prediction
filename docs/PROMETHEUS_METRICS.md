# Prometheus metrics (PH2-010)

The API exposes **`GET /metrics`** (Prometheus text format) with:

- `http_requests_total{method,path,status}`
- `http_request_duration_seconds{method,path}`

UUID path segments are normalized to `{id}` to limit cardinality.

## Enable / disable

Default: enabled (`PROMETHEUS_METRICS_ENABLED=true` in env). Set `false` to disable instrumentation.

## Security

- **Nginx** public API vhosts must deny `/metrics` (see `deploy/nginx-deny-internal-snippet.conf`).
- Prometheus scrapes **`api:8000/metrics`** on the Docker network, not via the public URL.

## VPS setup

```bash
cd ~/sport_prediction
./scripts/deploy_api.sh          # rebuild API with prometheus-client
./scripts/setup_prometheus_monitoring.sh
```

Prometheus listens on **`127.0.0.1:9090`** (docker-compose). Access via SSH tunnel:

```bash
ssh -L 9090:127.0.0.1:9090 root@YOUR_VPS
# open http://localhost:9090
```

Optional Grafana: `http://127.0.0.1:3000` (default admin/admin — change on first login).

## Config

| File | Purpose |
|------|---------|
| `monitoring/prometheus/prometheus.yml` | Scrape jobs for API + staging API |
| `docker-compose.yml` | `prometheus` + `grafana` services (`--profile monitoring`) |
| `scripts/setup_prometheus_monitoring.sh` | Start monitoring stack |

## Staging

`api-staging:8000/metrics` is scraped when the staging API container runs and Prometheus uses the shared compose network.

## Verify

```bash
curl -fsS http://127.0.0.1:8000/metrics | head
docker compose --profile monitoring exec prometheus wget -qO- http://api:8000/metrics | head
```

Public URL should be blocked:

```bash
curl -sS -o /dev/null -w "%{http_code}" https://api.octobetiq.com/metrics   # expect 403
```
