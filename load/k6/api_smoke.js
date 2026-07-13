import http from 'k6/http';
import { check, sleep } from 'k6';

// Optional richer load: API_URL=http://127.0.0.1:8001 k6 run load/k6/api_smoke.js
const BASE = __ENV.API_URL || 'http://127.0.0.1:8001';

export const options = {
  vus: Number(__ENV.VUS || 5),
  duration: __ENV.DURATION || '30s',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const paths = ['/health', '/ready', '/api/v1/stats/data-telemetry'];
  for (const path of paths) {
    const res = http.get(`${BASE}${path}`);
    check(res, {
      'status is 2xx/3xx': (r) => r.status >= 200 && r.status < 400,
    });
  }
  sleep(0.5);
}
