import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { SKIP_AUDIT_KEY } from '../decorators/skip-audit.decorator';

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

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method?.toUpperCase();

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
    const { modulo, entidad } = this.extractModuleEntity(context, request);
    const ip =
      (request.headers?.['x-forwarded-for'] as string) ||
      request.ip ||
      '127.0.0.1';
    const userAgent = request.headers?.['user-agent'] || '';

    // Capture request body for the audit payload
    const requestPayload = this.sanitizePayload(request.body);

    return next.handle().pipe(
      tap({
        next: (responseData) => {
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
          }).catch((err) => {
            console.error(
              '[AuditInterceptor] Failed to write log:',
              err.message,
            );
          });
        },
        error: (err) => {
          // Log failed mutations too
          this.writeLog({
            tenantId: user.tenantId,
            userId: user.sub,
            nombre: user.email || 'unknown',
            accion,
            modulo,
            entidad,
            entidadId: request.params?.id || undefined,
            ip,
            userAgent,
            payload: {
              request: requestPayload,
              error: { message: err.message, status: err.status },
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

  private extractModuleEntity(
    context: ExecutionContext,
    request: any,
  ): { modulo: string; entidad: string } {
    // Use controller class name to derive module/entity
    const controllerName = context.getClass().name || '';

    // TenantsController → module: "Tenants", entity: "Tenant"
    const modulo = controllerName.replace('Controller', '') || 'Unknown';
    const entidad = modulo.endsWith('s') ? modulo.slice(0, -1) : modulo;

    return { modulo, entidad };
  }

  private extractEntityId(request: any, response: any): string | undefined {
    // From URL params (PUT /api/users/:id)
    if (request.params?.id) {
      return request.params.id;
    }
    // From response (POST creates → response.id)
    if (response?.id) {
      return response.id;
    }
    return undefined;
  }

  private sanitizePayload(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const sanitized = { ...body };
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

  private summarizeResponse(data: any): any {
    if (!data) return null;
    // For arrays, just return count
    if (Array.isArray(data)) {
      return { count: data.length };
    }
    // For objects with id, return just id
    if (data.id) {
      return { id: data.id };
    }
    // For messages
    if (data.message) {
      return { message: data.message };
    }
    return { type: typeof data };
  }

  private async writeLog(data: {
    tenantId: string;
    userId: string;
    nombre: string;
    accion: string;
    modulo: string;
    entidad: string;
    entidadId?: string;
    ip: string;
    userAgent: string;
    payload: any;
  }) {
    await this.prisma.auditLog.create({
      data: {
        tenant_id: data.tenantId,
        user_id: data.userId,
        nombre_usuario: data.nombre,
        accion: data.accion as any,
        modulo: data.modulo,
        entidad: data.entidad,
        entidad_id: data.entidadId,
        ip_address: data.ip,
        user_agent: data.userAgent,
        payload_cambio: data.payload,
      },
    });
  }
}
