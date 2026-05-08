// k6 load test — flujo de pipeline y lectura de clientes
// Ejecutar: k6 run infra/k6/pipeline.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '2m',  target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<800', 'p(99)<2000'],
    http_req_failed:   ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

function getToken() {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: 'admin@demo.com', password: 'Admin1234!' }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  if (res.status !== 200) return null;
  return JSON.parse(res.body).accessToken;
}

export function setup() {
  return { token: getToken() };
}

export default function ({ token }) {
  if (!token) { sleep(1); return; }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Pipeline board
  const pipelineRes = http.get(`${BASE_URL}/api/pipeline`, { headers });
  check(pipelineRes, { 'pipeline 200': (r) => r.status === 200 });
  errorRate.add(pipelineRes.status !== 200);

  // Clientes
  const clientesRes = http.get(`${BASE_URL}/api/clientes?page=1&limit=10`, { headers });
  check(clientesRes, { 'clientes 200': (r) => r.status === 200 });
  errorRate.add(clientesRes.status !== 200);

  // Notificaciones
  const notifRes = http.get(`${BASE_URL}/api/notificaciones`, { headers });
  check(notifRes, { 'notificaciones 200': (r) => r.status === 200 });
  errorRate.add(notifRes.status !== 200);

  sleep(2);
}
