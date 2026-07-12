import { IsEmail, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class FiltrosPublicasDto {
  // 'portal' (default): sitio público del tenant. 'mapa_crm': mapa interno en crm.gestprop.net/portal
  @IsOptional() @IsIn(['portal', 'mapa_crm']) vista?: string;
  @IsOptional() @IsString() @MaxLength(50)  tipo?: string;
  @IsOptional() @IsString() @MaxLength(20)  gestion?: string;
  @IsOptional() @IsString() @MaxLength(100) departamento?: string;
  @IsOptional() @IsString() @MaxLength(100) municipio?: string;
  @IsOptional() @IsString() @MaxLength(50)  zona?: string;
  @IsOptional() @IsString() @MaxLength(100) busqueda?: string;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(0) precioMin?: number;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(0) precioMax?: number;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(0) @Max(20) habitacionesMin?: number;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) page?: number;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) @Max(50) limit?: number;
  @IsOptional() @IsString() @MaxLength(36) tenantId?: string;
}

export class RegistroPortalDto {
  @IsString() @MinLength(2) @MaxLength(120) nombre!: string;
  @IsEmail() @MaxLength(200) email!: string;
  @IsOptional() @IsString() @MaxLength(30) telefono?: string;
  @IsOptional() @IsString() @MaxLength(36) propiedad_id?: string;
  @IsOptional() @IsString() @MaxLength(1000) mensaje?: string;
}

export class VerificarEmailDto {
  @IsString() @MinLength(36) @MaxLength(36) token!: string;
}

export class SolicitarAccesoDto {
  @IsEmail() @MaxLength(200) email!: string;
  @IsOptional() @IsString() @MaxLength(36) tenantId?: string;
}

export class ChatbotLeadDto {
  @IsString() @MinLength(2) @MaxLength(120) nombre!: string;
  @IsOptional() @IsEmail() @MaxLength(200) email?: string;
  @IsOptional() @IsString() @MaxLength(30) telefono?: string;
  @IsOptional() @IsString() @MaxLength(20) gestion_interes?: string;
  @IsOptional() @IsString() @MaxLength(100) zona_interes?: string;
  @IsOptional() @Transform(({ value }) => Number(value)) presupuesto_max?: number;
  @IsOptional() @IsString() @MaxLength(40) tipo_propiedad?: string;
  @IsOptional() @IsString() @MaxLength(36) propiedad_id?: string;
}
