import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import type { Request } from 'express';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SKIP_AUDIT_KEY } from '../decorators/skip-audit.decorator';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';

type AuditRequest = Request & { user?: AuthenticatedUser };

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function hasId(value: unknown): value is { id: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string'
  );
}

function hasMessage(value: unknown): value is { message: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof value.message === 'string'
  );
}

function hasStatus(value: unknown): value is { status: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    typeof value.status === 'number'
  );
}

/**
 * AuditInterceptor
 *
 * Global NestJS interceptor that automatically logs mutating operations
 * (POST, PUT, PATCH, DELETE) to the audit_logs table.
 *
 * It captures:
 * - Who: user ID, name (from JWT)
 * - What: HTTP method → audit action, controller/route → module/entity
 * - Where: IP address, user agent
 * - When: automatic timestamp
 * - Payload: request body (for CREATE/UPDATE), response summary
 *
 * Skipped for:
 * - GET/HEAD/OPTIONS requests (read-only)
 * - Routes decorated with @SkipAudit()
 * - Unauthenticated requests (no user in JWT)
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuditRequest>();
    const method = request.method?.toUpperCase() ?? '';

    // Skip read-only methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return next.handle();
    }

    // Skip if decorated with @SkipAudit()
    const skipAudit = this.reflector.getAllAndOverride<boolean>(
      SKIP_AUDIT_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skipAudit) {
      return next.handle();
    }

    // Skip if no authenticated user
    const user = request.user;
    if (!user?.sub || !user?.tenantId) {
      return next.handle();
    }

    // Derive audit metadata from the request
    const accion = this.mapMethodToAction(method);
    const { modulo, entidad } = this.extractModuleEntity(context);
    const ip =
      (request.headers?.['x-forwarded-for'] as string) ||
      request.ip ||
      '127.0.0.1';
    const userAgent = request.headers?.['user-agent'] || '';

    // Capture request body for the audit payload
    const requestPayload = this.sanitizePayload(request.body);

    return next.handle().pipe(
      tap({
        next: (responseData: unknown) => {
          // Fire-and-forget: don't block the response
          this.writeLog({
            tenantId: user.tenantId,
            userId: user.sub,
            nombre: user.email || 'unknown',
            accion,
            modulo,
            entidad,
            entidadId: this.extractEntityId(request, responseData),
            ip,
            userAgent,
            payload: {
              request: requestPayload,
              response: this.summarizeResponse(responseData),
            },
          }).catch((err: unknown) => {
            console.error(
              '[AuditInterceptor] Failed to write log:',
              toErrorMessage(err),
            );
          });
        },
        error: (err: unknown) => {
          // Log failed mutations too
          const message = toErrorMessage(err);
          const status = hasStatus(err) ? err.status : undefined;
          this.writeLog({
            tenantId: user.tenantId,
            userId: user.sub,
            nombre: user.email || 'unknown',
            accion,
            modulo,
            entidad,
            entidadId: this.paramId(request),
            ip,
            userAgent,
            payload: {
              request: requestPayload,
              error: { message, status },
            },
          }).catch(() => {});
        },
      }),
    );
  }

  private mapMethodToAction(method: string): 'CREATE' | 'UPDATE' | 'DELETE' {
    switch (method) {
      case 'POST':
        return 'CREATE';
      case 'PUT':
      case 'PATCH':
        return 'UPDATE';
      case 'DELETE':
        return 'DELETE';
      default:
        return 'CREATE';
    }
  }

  private extractModuleEntity(context: ExecutionContext): {
    modulo: string;
    entidad: string;
  } {
    // Use controller class name to derive module/entity
    const controllerName = context.getClass().name || '';

    // TenantsController → module: "Tenants", entity: "Tenant"
    const modulo = controllerName.replace('Controller', '') || 'Unknown';
    const entidad = modulo.endsWith('s') ? modulo.slice(0, -1) : modulo;

    return { modulo, entidad };
  }

  private extractEntityId(
    request: AuditRequest,
    response: unknown,
  ): string | undefined {
    // From URL params (PUT /api/users/:id)
    const paramId = this.paramId(request);
    if (paramId) return paramId;
    // From response (POST creates → response.id)
    if (hasId(response)) {
      return response.id;
    }
    return undefined;
  }

  /** request.params values are typed string | string[] in Express — normalize to a single string. */
  private paramId(request: AuditRequest): string | undefined {
    const raw = request.params?.id;
    return Array.isArray(raw) ? raw[0] : raw;
  }

  private sanitizePayload(body: unknown): unknown {
    if (!body || typeof body !== 'object') return body;

    const sanitized: Record<string, unknown> = { ...body };
    // Remove sensitive fields
    const sensitiveKeys = [
      'password',
      'password_hash',
      'newPassword',
      'currentPassword',
      'totpCode',
      'tempToken',
      'refreshToken',
      'totp_secret',
      'secret',
    ];
    for (const key of sensitiveKeys) {
      if (key in sanitized) {
        sanitized[key] = '[REDACTED]';
      }
    }
    return sanitized;
  }

  private summarizeResponse(data: unknown): unknown {
    if (!data) return null;
    // For arrays, just return count
    if (Array.isArray(data)) {
      return { count: data.length };
    }
    // For objects with id, return just id
    if (hasId(data)) {
      return { id: data.id };
    }
    // For messages
    if (hasMessage(data)) {
      return { message: data.message };
    }
    return { type: typeof data };
  }

  private async writeLog(data: {
    tenantId: string;
    userId: string;
    nombre: string;
    accion: 'CREATE' | 'UPDATE' | 'DELETE';
    modulo: string;
    entidad: string;
    entidadId?: string;
    ip: string;
    userAgent: string;
    payload: unknown;
  }) {
    await this.prisma.auditLog.create({
      data: {
        tenant_id: data.tenantId,
        user_id: data.userId,
        nombre_usuario: data.nombre,
        accion: data.accion,
        modulo: data.modulo,
        entidad: data.entidad,
        entidad_id: data.entidadId,
        ip_address: data.ip,
        user_agent: data.userAgent,
        payload_cambio: data.payload as Prisma.InputJsonValue,
      },
    });
  }
}
