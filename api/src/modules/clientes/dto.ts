import { IsString, IsOptional, IsEmail, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, Min } from 'class-validator';

export class CreateClienteDto {
  @IsString() nombre: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsString() dpi?: string;
  @IsOptional() @IsEnum(['PORTAL_WEB', 'REFERIDO', 'LLAMADA', 'WHATSAPP', 'REDES_SOCIALES', 'FERIA', 'OTRO'])
  origen?: string;
  @IsOptional() @IsString() notas?: string;
  @IsOptional() @IsString() agenteId?: string;
}

export class UpdateClienteDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsString() dpi?: string;
  @IsOptional() @IsEnum(['PORTAL_WEB', 'REFERIDO', 'LLAMADA', 'WHATSAPP', 'REDES_SOCIALES', 'FERIA', 'OTRO'])
  origen?: string;
  @IsOptional() @IsString() notas?: string;
  @IsOptional() @IsString() agenteId?: string;
}

export class FiltrosClienteDto {
  @IsOptional() @IsString() origen?: string;
  @IsOptional() @IsString() busqueda?: string;
  @IsOptional() @IsString() agenteId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}
