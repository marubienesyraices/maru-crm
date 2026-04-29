export enum Rol {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  SENIOR = 'SENIOR',
  JUNIOR = 'JUNIOR',
}

export enum EstadoUsuario {
  PENDIENTE = 'PENDIENTE',
  ACTIVO = 'ACTIVO',
  SUSPENDIDO = 'SUSPENDIDO',
  INACTIVO = 'INACTIVO',
}

export enum EstadoTenant {
  ACTIVA = 'ACTIVA',
  SUSPENDIDA = 'SUSPENDIDA',
  CANCELADA = 'CANCELADA',
}

export enum Plan {
  FREE = 'FREE',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export enum AccionAudit {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface Verify2FADto {
  tempToken: string;
  totpCode: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;        // user id
  tenantId: string;
  email: string;
  rol: Rol;
  iat?: number;
  exp?: number;
}
