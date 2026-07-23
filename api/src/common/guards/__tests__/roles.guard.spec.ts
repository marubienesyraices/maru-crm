import { RolesGuard } from '../roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function mockContext(userRol: string): ExecutionContext {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user: { rol: userRol } }) }),
    } as unknown as ExecutionContext;
  }

  it('debe permitir acceso si no hay roles requeridos', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(mockContext('JUNIOR'))).toBe(true);
  });

  it('debe permitir acceso si el rol del usuario está incluido', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['ADMIN', 'SUPER_ADMIN']);
    expect(guard.canActivate(mockContext('ADMIN'))).toBe(true);
  });

  it('debe denegar acceso si el rol del usuario NO está incluido', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['SUPER_ADMIN']);
    expect(guard.canActivate(mockContext('JUNIOR'))).toBe(false);
  });
});
