# HA and API scaling (W3 / I56)

Production today: **single VPS** running Docker Compose (`docker-compose.prod.yml`). This is acceptable for early scale; eliminate the SPOF when uptime SLAs or traffic require it.

## Options (pick one path)

| Path | Complexity | Best when |
|------|------------|-----------|
| **A. Second VPS + nginx failover** | Medium | Same stack, manual failover acceptable |
| **B. DO App Platform / Render** | Medium | Want managed deploys without K8s |
| **C. Managed K8s (DO K8s, EKS)** | High | Need autoscaling + multi-AZ |

In-repo helpers: `scripts/deploy_api_blue_green.sh`, `scripts/nginx_swap_upstream.sh`, Redis-backed sessions/revocation (required for multi-worker).

---

## Path A — Warm standby VPS

1. Provision second droplet (same region or different for DR).
2. Clone repo, copy `.env.production` (unique secrets optional for standby).
3. Run `./scripts/deploy_api.sh` on standby; keep postgres **primary only** on VPS1 (standby API points at primary DB over private VPC or TLS + IP allowlist).
4. nginx on primary with `backup` upstream:

```nginx
upstream octobetiq_api {
    server 127.0.0.1:8000;
    server STANDBY_IP:8000 backup;
}
```

5. Failover: `./scripts/nginx_swap_upstream.sh` or promote standby DB from latest offsite dump.

**Verify:** `./scripts/check_uptime.sh` (or external ping) from both regions.

---

## Path B — Horizontal API scale (same VPS)

Run multiple API containers behind nginx (requires Redis for token revocation — already enforced in prod):

```bash
# Example: second API instance on host port 8002
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --scale api=2
```

Update nginx upstream to list both backend ports. Use `scripts/deploy_api_blue_green.sh` for zero-downtime deploys.

**Limits:** Single postgres/redis remain SPOF until managed services (I51).

---

## Path C — Autoscaling (I56)

Requires an orchestrator:

1. **DO App Platform** — connect repo, set `DATABASE_URL` + `REDIS_URL`, min/max instances  
2. **Kubernetes** — Deployment with HPA on CPU; Ingress + cert-manager  
3. **Docker Swarm** — `deploy.replicas: 2` in compose (lightweight)

Health check: `GET /health` (already in compose healthchecks).

---

## Pre-scale checklist

- [ ] Redis `REDIS_URL` set (JWT denylist, rate limits, WebSocket pub/sub)  
- [ ] Offsite backups working — [OFFSITE_BACKUP_RUNBOOK.md](./OFFSITE_BACKUP_RUNBOOK.md)  
- [ ] Staging smoke test after deploy pattern change  
- [ ] Prometheus scrape target updated if port layout changes — [PROMETHEUS_METRICS.md](./PROMETHEUS_METRICS.md)
- [ ] Invite-beta SLOs + staging load/chaos recorded — [SLO_AND_CAPACITY.md](./SLO_AND_CAPACITY.md), [LOAD_AND_CHAOS.md](./LOAD_AND_CHAOS.md)

---

## Rollback

Use blue/green swap back to previous upstream, or restore DB from latest dump per [DATABASE_BACKUP.md](./DATABASE_BACKUP.md).
