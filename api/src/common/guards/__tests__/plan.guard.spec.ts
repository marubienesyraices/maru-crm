import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PlanGuard } from '../plan.guard';
import { createMockPrismaService } from '../../../../test/mocks/prisma.mock';

describe('PlanGuard', () => {
  let guard: PlanGuard;
  let reflector: Reflector;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    reflector = new Reflector();
    prisma = createMockPrismaService();
    guard = new PlanGuard(reflector, prisma as any);
  });

  function mockContext(user: any): ExecutionContext {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
  }

  it('debe permitir acceso si la ruta no requiere ninguna feature de plan', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    await expect(guard.canActivate(mockContext(null))).resolves.toBe(true);
  });

  it('debe denegar acceso si no hay usuario en el request', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('tiene_portal');
    await expect(guard.canActivate(mockContext(undefined))).resolves.toBe(
      false,
    );
  });

  it('SUPER_ADMIN siempre pasa, sin consultar el plan', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('tiene_portal');
    const result = await guard.canActivate(
      mockContext({ rol: 'SUPER_ADMIN', tenantId: 't1' }),
    );
    expect(result).toBe(true);
    expect(prisma.tenant.findUnique).not.toHaveBeenCalled();
  });

  it('debe denegar acceso si el usuario no tiene tenantId', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('tiene_portal');
    await expect(
      guard.canActivate(mockContext({ rol: 'ADMIN', tenantId: undefined })),
    ).resolves.toBe(false);
  });

  it('debe denegar acceso si el tenant no existe', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('tiene_portal');
    prisma.tenant.findUnique.mockResolvedValue(null);
    await expect(
      guard.canActivate(mockContext({ rol: 'ADMIN', tenantId: 't1' })),
    ).resolves.toBe(false);
  });

  it('debe lanzar ForbiddenException si el catálogo del plan no incluye la feature', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('tiene_portal');
    prisma.tenant.findUnique.mockResolvedValue({ plan: 'FREE' });
    prisma.catalogoPlan.findUnique.mockResolvedValue({ tiene_portal: false });

    await expect(
      guard.canActivate(mockContext({ rol: 'ADMIN', tenantId: 't1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('debe lanzar ForbiddenException si no existe fila de catálogo para el plan', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('tiene_portal');
    prisma.tenant.findUnique.mockResolvedValue({ plan: 'FREE' });
    prisma.catalogoPlan.findUnique.mockResolvedValue(null);

    await expect(
      guard.canActivate(mockContext({ rol: 'ADMIN', tenantId: 't1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('debe permitir acceso si el plan incluye la feature requerida', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('tiene_portal');
    prisma.tenant.findUnique.mockResolvedValue({ plan: 'PRO' });
    prisma.catalogoPlan.findUnique.mockResolvedValue({ tiene_portal: true });

    await expect(
      guard.canActivate(mockContext({ rol: 'ADMIN', tenantId: 't1' })),
    ).resolves.toBe(true);
  });
});
