import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  IsEnum,
  IsDateString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsEmail()
  adminEmail: string;

  @IsString()
  @IsNotEmpty()
  adminNombre: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsString()
  moneda?: string;

  @IsOptional()
  @IsString()
  zonaHoraria?: string;

  @IsOptional()
  @IsInt()
  limiteUsuarios?: number;

  @IsOptional()
  @IsInt()
  limitePropiedades?: number;

  @IsOptional()
  @IsEnum(['ACTIVA', 'SUSPENDIDA', 'TRIAL', 'CANCELADA'])
  estado?: string;

  @IsOptional()
  @Transform(({ value }) => value || undefined)
  @IsDateString()
  trialHasta?: string;
}

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  colorPrimario?: string;

  @IsOptional()
  @IsString()
  colorSecundario?: string;

  @IsOptional()
  @IsString()
  colorAcento?: string;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsString()
  moneda?: string;

  @IsOptional()
  @IsString()
  zonaHoraria?: string;

  @IsOptional()
  @IsInt()
  limiteUsuarios?: number;

  @IsOptional()
  @IsInt()
  limitePropiedades?: number;

  @IsOptional()
  @IsEnum(['ACTIVA', 'SUSPENDIDA', 'TRIAL', 'CANCELADA'])
  estado?: string;

  @IsOptional()
  @Transform(({ value }) => value || undefined)
  @IsDateString()
  trialHasta?: string;
}

export class UpdateConfigSeguridadDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  porcentaje_iva?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  comision_pct_venta_default?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  dias_inactividad_lead?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  buffer_entre_citas_min?: number;
}
