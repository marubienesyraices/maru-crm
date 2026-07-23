import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';

const TENANT_STATUS_TTL = 60; // seconds

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    const secret = config.get<string>('JWT_ACCESS_SECRET');
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET environment variable is required');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    // SUPER_ADMIN manages all tenants — exempt from tenant status check
    if (payload.rol !== 'SUPER_ADMIN' && payload.tenantId) {
      const estado = await this.getTenantStatus(payload.tenantId);
      if (estado && estado !== 'ACTIVA' && estado !== 'TRIAL') {
        throw new UnauthorizedException(
          'La empresa se encuentra suspendida o cancelada',
        );
      }
    }

    return {
      sub: payload.sub,
      tenantId: payload.tenantId,
      email: payload.email,
      rol: payload.rol,
    };
  }

  private async getTenantStatus(tenantId: string): Promise<string | null> {
    const cacheKey = `tenant:status:${tenantId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { estado: true },
    });
    const estado = tenant?.estado ?? null;
    if (estado) await this.redis.set(cacheKey, estado, TENANT_STATUS_TTL);
    return estado;
  }
}
