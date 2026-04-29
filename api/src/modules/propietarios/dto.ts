import { IsString, IsOptional, IsEmail } from 'class-validator';

export class CreatePropietarioDto {
  @IsString() nombre: string;
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() dpi?: string;
  @IsOptional() @IsString() nit?: string;
  @IsOptional() @IsString() direccion?: string;
  @IsOptional() @IsString() notas?: string;
}

export class UpdatePropietarioDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() dpi?: string;
  @IsOptional() @IsString() nit?: string;
  @IsOptional() @IsString() direccion?: string;
  @IsOptional() @IsString() notas?: string;
}
