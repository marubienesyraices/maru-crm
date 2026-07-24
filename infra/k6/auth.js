// k6 load test — flujo de autenticación
// Ejecutar: k6 run infra/k6/auth.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // rampa hasta 10 usuarios
    { duration: '1m',  target: 50 },   // mantener 50 usuarios
    { duration: '30s', target: 0 },    // bajada
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% de requests < 500ms
    http_req_failed:   ['rate<0.01'],  // < 1% de errores
    errors:            ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Login
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: 'admin@gestprop.net', password: 'Admin@2026Desa' }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  loginDuration.add(loginRes.timings.duration);

  const loginOk = check(loginRes, {
    'login status 200 o 201': (r) => r.status === 200 || r.status === 201,
    'tiene accessToken': (r) => {
      try { return !!JSON.parse(r.body).accessToken; } catch { return false; }
    },
  });

  errorRate.add(!loginOk);

  if (!loginOk) {
    sleep(1);
    return;
  }

  const token = JSON.parse(loginRes.body).accessToken;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Listado de propiedades
  const propRes = http.get(`${BASE_URL}/api/propiedades?page=1&limit=12`, { headers });
  check(propRes, { 'propiedades 200': (r) => r.status === 200 });
  errorRate.add(propRes.status !== 200);

  sleep(1);
}
