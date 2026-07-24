import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

// Smoke test: la app completa debe arrancar (todos los módulos, incluyendo
// Prisma/Redis/BullMQ) y exponer el liveness check real (GET /api/health).
// Antes este archivo era el boilerplate default de Nest apuntando a GET /
// ("Hello World!"), una ruta que no existe en la app real — quedaba como
// código muerto sin ejecutarse desde ningún script de CI.
describe('AppModule (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('GET /api/health responde ok con timestamp', async () => {
    const res = await request(app.getHttpServer()).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', ts: expect.any(String) });
    expect(Number.isNaN(Date.parse(res.body.ts))).toBe(false);
  });

  afterAll(async () => {
    await app.close();
  });
});
