// k6 load test — portal público (sin autenticación)
// Ejecutar: k6 run infra/k6/portal-publico.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 30 },
    { duration: '2m',  target: 100 },  // pico de tráfico público
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],  // SSR puede ser más lento
    http_req_failed:   ['rate<0.02'],
  },
};

const API_URL    = __ENV.API_URL    || 'http://localhost:3000';
const PORTAL_URL = __ENV.PORTAL_URL || 'http://localhost:3001';

export default function () {
  // API endpoint público
  const apiRes = http.get(`${API_URL}/api/public/propiedades?page=1&limit=12`);
  check(apiRes, { 'portal API 200': (r) => r.status === 200 });
  errorRate.add(apiRes.status !== 200);

  // Portal Next.js (SSR)
  const portalRes = http.get(`${PORTAL_URL}/`);
  check(portalRes, { 'portal HTML 200': (r) => r.status === 200 });
  errorRate.add(portalRes.status !== 200);

  sleep(1);
}
