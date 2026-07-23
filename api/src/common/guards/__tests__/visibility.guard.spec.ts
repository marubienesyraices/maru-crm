import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { VisibilityGuard } from '../visibility.guard';

describe('VisibilityGuard', () => {
  let guard: VisibilityGuard;
  let usersService: { getDownline: jest.Mock; getUpline: jest.Mock };

  beforeEach(() => {
    usersService = { getDownline: jest.fn(), getUpline: jest.fn() };
    guard = new VisibilityGuard(usersService as any, new Reflector());
  });

  function mockContext(user: any) {
    const request: any = { user };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    return { ctx, request };
  }

  it('debe permitir acceso sin filtrar si no hay usuario (ruta pública)', async () => {
    const { ctx, request } = mockContext(undefined);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(request.visibleUserIds).toBeUndefined();
  });

  it('ADMIN debe ver todo (visibleUserIds = null)', async () => {
    const { ctx, request } = mockContext({
      rol: 'ADMIN',
      sub: 'u1',
      tenantId: 't1',
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(request.visibleUserIds).toBeNull();
    expect(usersService.getDownline).not.toHaveBeenCalled();
    expect(usersService.getUpline).not.toHaveBeenCalled();
  });

  it('SUPER_ADMIN debe ver todo (visibleUserIds = null)', async () => {
    const { ctx, request } = mockContext({
      rol: 'SUPER_ADMIN',
      sub: 'u1',
      tenantId: 't1',
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(request.visibleUserIds).toBeNull();
  });

  it('SENIOR debe ver a sí mismo más su downline completo', async () => {
    usersService.getDownline.mockResolvedValue([
      { id: 'junior-1' },
      { id: 'junior-2' },
    ]);
    const { ctx, request } = mockContext({
      rol: 'SENIOR',
      sub: 'senior-1',
      tenantId: 't1',
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(usersService.getDownline).toHaveBeenCalledWith('t1', 'senior-1');
    expect(request.visibleUserIds).toEqual([
      'senior-1',
      'junior-1',
      'junior-2',
    ]);
  });

  it('JUNIOR debe ver a sí mismo más su upline (supervisor)', async () => {
    usersService.getUpline.mockResolvedValue([{ id: 'senior-1' }]);
    const { ctx, request } = mockContext({
      rol: 'JUNIOR',
      sub: 'junior-1',
      tenantId: 't1',
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(usersService.getUpline).toHaveBeenCalledWith('t1', 'junior-1');
    expect(request.visibleUserIds).toEqual(['junior-1', 'senior-1']);
    expect(usersService.getDownline).not.toHaveBeenCalled();
  });
});
