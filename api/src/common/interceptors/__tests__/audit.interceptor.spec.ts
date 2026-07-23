import { of, throwError } from 'rxjs';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditInterceptor } from '../audit.interceptor';
import { createMockPrismaService } from '../../../../test/mocks/prisma.mock';

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let reflector: Reflector;

  beforeEach(() => {
    prisma = createMockPrismaService();
    reflector = new Reflector();
    interceptor = new AuditInterceptor(prisma as any, reflector);
  });

  function mockContext(
    request: any,
    className = 'PropiedadesController',
  ): ExecutionContext {
    return {
      getHandler: () => ({}),
      getClass: () => ({ name: className }),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  }

  function mockHandler(
    result: any = { id: 'p-1' },
    isError = false,
  ): CallHandler {
    return { handle: () => (isError ? throwError(() => result) : of(result)) };
  }

  async function flush() {
    await new Promise((r) => setImmediate(r));
  }

  it('debe omitir el log en requests GET', async () => {
    const ctx = mockContext({
      method: 'GET',
      user: { sub: 'u1', tenantId: 't1' },
    });
    interceptor.intercept(ctx, mockHandler()).subscribe();
    await flush();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('debe omitir el log en rutas con @SkipAudit()', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const ctx = mockContext({
      method: 'POST',
      user: { sub: 'u1', tenantId: 't1' },
    });
    interceptor.intercept(ctx, mockHandler()).subscribe();
    await flush();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('debe omitir el log si no hay usuario autenticado', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = mockContext({ method: 'POST', user: undefined });
    interceptor.intercept(ctx, mockHandler()).subscribe();
    await flush();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('debe omitir el log si el usuario no tiene tenantId', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = mockContext({ method: 'POST', user: { sub: 'u1' } });
    interceptor.intercept(ctx, mockHandler()).subscribe();
    await flush();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('debe registrar CREATE en POST exitoso, derivando módulo/entidad del controller', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = mockContext(
      {
        method: 'POST',
        user: { sub: 'u1', tenantId: 't1', email: 'a@x.com' },
        body: { titulo: 'x' },
        params: {},
        headers: {},
      },
      'PropiedadesController',
    );
    interceptor.intercept(ctx, mockHandler({ id: 'p-1' })).subscribe();
    await flush();

    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    const data = prisma.auditLog.create.mock.calls[0][0].data;
    expect(data.accion).toBe('CREATE');
    expect(data.modulo).toBe('Propiedades');
    expect(data.entidad).toBe('Propiedade');
    expect(data.entidad_id).toBe('p-1');
    expect(data.tenant_id).toBe('t1');
    expect(data.user_id).toBe('u1');
  });

  it('debe registrar UPDATE en PUT/PATCH y usar el id de los params si existe', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = mockContext({
      method: 'PATCH',
      user: { sub: 'u1', tenantId: 't1' },
      body: {},
      params: { id: 'existing-id' },
      headers: {},
    });
    interceptor.intercept(ctx, mockHandler({ ok: true })).subscribe();
    await flush();

    const data = prisma.auditLog.create.mock.calls[0][0].data;
    expect(data.accion).toBe('UPDATE');
    expect(data.entidad_id).toBe('existing-id');
  });

  it('debe registrar DELETE en requests DELETE', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = mockContext({
      method: 'DELETE',
      user: { sub: 'u1', tenantId: 't1' },
      body: {},
      params: { id: 'del-1' },
      headers: {},
    });
    interceptor
      .intercept(ctx, mockHandler({ message: 'eliminado' }))
      .subscribe();
    await flush();

    const data = prisma.auditLog.create.mock.calls[0][0].data;
    expect(data.accion).toBe('DELETE');
  });

  it('debe redactar campos sensibles del payload', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = mockContext({
      method: 'POST',
      user: { sub: 'u1', tenantId: 't1' },
      body: { email: 'a@x.com', password: 'secreto', totpCode: '123456' },
      params: {},
      headers: {},
    });
    interceptor.intercept(ctx, mockHandler({ id: '1' })).subscribe();
    await flush();

    const data = prisma.auditLog.create.mock.calls[0][0].data;
    expect(data.payload_cambio.request.password).toBe('[REDACTED]');
    expect(data.payload_cambio.request.totpCode).toBe('[REDACTED]');
    expect(data.payload_cambio.request.email).toBe('a@x.com');
  });

  it('debe resumir arrays en la respuesta como { count }', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = mockContext({
      method: 'POST',
      user: { sub: 'u1', tenantId: 't1' },
      body: {},
      params: {},
      headers: {},
    });
    interceptor
      .intercept(ctx, mockHandler([{ id: '1' }, { id: '2' }]))
      .subscribe();
    await flush();

    const data = prisma.auditLog.create.mock.calls[0][0].data;
    expect(data.payload_cambio.response).toEqual({ count: 2 });
  });

  it('debe registrar el log también cuando el handler falla, incluyendo el error', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = mockContext({
      method: 'POST',
      user: { sub: 'u1', tenantId: 't1' },
      body: { nombre: 'x' },
      params: {},
      headers: {},
    });
    const error = Object.assign(new Error('fallo de validación'), {
      status: 400,
    });

    interceptor
      .intercept(ctx, mockHandler(error, true))
      .subscribe({ error: () => {} });
    await flush();

    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    const data = prisma.auditLog.create.mock.calls[0][0].data;
    expect(data.payload_cambio.error).toEqual({
      message: 'fallo de validación',
      status: 400,
    });
  });

  it('no debe propagar el error si falla la escritura del log de auditoría', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    prisma.auditLog.create.mockRejectedValue(new Error('DB caída'));
    const ctx = mockContext({
      method: 'POST',
      user: { sub: 'u1', tenantId: 't1' },
      body: {},
      params: {},
      headers: {},
    });

    let observedValue: any;
    interceptor
      .intercept(ctx, mockHandler({ id: '1' }))
      .subscribe({ next: (v) => (observedValue = v) });
    await flush();

    expect(observedValue).toEqual({ id: '1' });
  });
});
