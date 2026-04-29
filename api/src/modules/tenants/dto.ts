import { IsEmail, IsNotEmpty, IsOptional, IsString, IsInt, IsEnum } from 'class-validator';

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
  colorPrimario?: string;

  @IsOptional() @IsString()
  colorSecundario?: string;

  @IsOptional() @IsString()
  colorAcento?: string;

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
}

export class UpdateTenantDto {
  @IsOptional() @IsString()
  nombre?: string;

  @IsOptional() @IsString()
  logoUrl?: string;

  @IsOptional() @IsString()
  colorPrimario?: string;

  @IsOptional() @IsString()
  colorSecundario?: string;

  @IsOptional() @IsString()
  colorAcento?: string;

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

  @IsOptional() @IsString()
  estado?: string;
}
