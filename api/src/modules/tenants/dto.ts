import { IsEmail, IsNotEmpty, IsOptional, IsString, IsInt, IsEnum, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateTenantDto {
  @IsString() @IsNotEmpty()
  nombre: string;

  @IsEmail()
  adminEmail: string;

  @IsString() @IsNotEmpty()
  adminNombre: string;

  @IsOptional() @IsString()
  logoUrl?: string;

  @IsOptional() @IsString()
  plan?: string;

  @IsOptional() @IsString()
  moneda?: string;

  @IsOptional() @IsString()
  zonaHoraria?: string;

  @IsOptional() @IsInt()
  limiteUsuarios?: number;

  @IsOptional() @IsInt()
  limitePropiedades?: number;

  @IsOptional() @IsEnum(['ACTIVA', 'SUSPENDIDA', 'TRIAL', 'CANCELADA'])
  estado?: string;

  @IsOptional() @Transform(({ value }) => value || undefined) @IsDateString()
  trialHasta?: string;
}

export class UpdateTenantDto {
  @IsOptional() @IsString()
  nombre?: string;

  @IsOptional() @IsString()
  logoUrl?: string;

  @IsOptional() @IsString()
  plan?: string;

  @IsOptional() @IsString()
  moneda?: string;

  @IsOptional() @IsString()
  zonaHoraria?: string;

  @IsOptional() @IsInt()
  limiteUsuarios?: number;

  @IsOptional() @IsInt()
  limitePropiedades?: number;

  @IsOptional() @IsEnum(['ACTIVA', 'SUSPENDIDA', 'TRIAL', 'CANCELADA'])
  estado?: string;

  @IsOptional() @Transform(({ value }) => value || undefined) @IsDateString()
  trialHasta?: string;
}
