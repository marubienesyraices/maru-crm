import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class FiltrosPublicasDto {
  @IsOptional() @IsString()   tipo?: string;
  @IsOptional() @IsString()   gestion?: string;
  @IsOptional() @IsString()   departamento?: string;
  @IsOptional() @IsString()   municipio?: string;
  @IsOptional() @IsString()   zona?: string;
  @IsOptional() @IsString()   busqueda?: string;
  @IsOptional() @Transform(({ value }) => Number(value)) precioMin?: number;
  @IsOptional() @Transform(({ value }) => Number(value)) precioMax?: number;
  @IsOptional() @Transform(({ value }) => Number(value)) habitacionesMin?: number;
  @IsOptional() @Transform(({ value }) => Number(value)) page?: number;
  @IsOptional() @Transform(({ value }) => Number(value)) limit?: number;
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
