# CDN for static assets (I57)

Cache **web** static files (landing, subscriber portal, model-vs-market dashboard) at the edge. API responses stay dynamic (`Cache-Control: no-store`).

## Candidates to cache

| Asset | Path | TTL |
|-------|------|-----|
| Landing HTML/CSS | `web/` | 1 h |
| Subscriber portal | `web/subscriber-portal.html` | 1 h |
| Model vs market dashboard | `web/model-vs-market.html` | 5 min |
| App Store screenshots (if served) | nginx static root | 24 h |

Do **not** CDN-cache `/api/v1/*` or `/internal/*`.

---

## Option A — Cloudflare (recommended)

1. Add domain `octobetiq.com` to Cloudflare; point nameservers.  
2. **Caching → Configuration** — respect origin cache headers.  
3. **Page Rules** or **Cache Rules**:
   - `octobetiq.com/web/*` → Cache Everything, TTL 1 hour  
   - `api.octobetiq.com/*` → Bypass cache  
4. Enable **Brotli** + **HTTP/2**.

Origin snippet (optional): `deploy/nginx-static-cache-snippet.conf.example`

---

## Option B — DigitalOcean CDN

1. Create CDN endpoint → origin = VPS IP or Spaces bucket for static only.  
2. Upload static web bundle to Spaces if you want origin off VPS.  
3. Point `www.octobetiq.com` CNAME to CDN URL.

---

## Option C — nginx cache (no CDN account)

On VPS, cache static files locally:

```nginx
proxy_cache_path /var/cache/nginx/octobetiq levels=1:2 keys_zone=static:10m max_size=100m;

location /web/ {
    alias /var/www/octobetiq/web/;
    expires 1h;
    add_header Cache-Control "public, max-age=3600";
}
```

This does not provide geographic edge but reduces VPS load.

---

## Verify

```bash
curl -sI https://octobetiq.com/web/ | grep -i cache-control
# API must not be cached:
curl -sI https://api.octobetiq.com/health | grep -i cache-control
```

---

## Mobile assets

Expo OTA updates and EAS builds are distributed via Expo/CDN already. No additional CDN required for app binaries.
