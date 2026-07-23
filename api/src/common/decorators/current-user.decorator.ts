import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Shape devuelto por JwtStrategy.validate() y adjuntado a req.user. */
export interface AuthenticatedUser {
  sub: string;
  tenantId: string;
  email: string;
  rol: 'SUPER_ADMIN' | 'ADMIN' | 'SENIOR' | 'JUNIOR';
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    if (data) {
      return request.user?.[data];
    }
    return request.user;
  },
);
