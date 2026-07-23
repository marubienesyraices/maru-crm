import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export type ClienteRequest = Request & {
  clienteId?: string;
  clienteTenantId?: string;
};

@Injectable()
export class ClienteJwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<ClienteRequest>();
    const auth = req.headers['authorization'];
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException();

    try {
      const payload = this.jwt.verify<{
        sub: string;
        tenantId: string;
        email: string;
        type: string;
      }>(auth.slice(7));
      if (payload.type !== 'cliente') throw new UnauthorizedException();
      req.clienteId = payload.sub;
      req.clienteTenantId = payload.tenantId;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
