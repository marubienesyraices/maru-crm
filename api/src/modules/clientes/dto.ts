import { IsString, IsOptional, IsEmail, IsEnum, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, Min } from 'class-validator';

const ORIGENES = ['PORTAL_WEB', 'REFERIDO', 'LLAMADA', 'WHATSAPP', 'REDES_SOCIALES', 'FERIA', 'OTRO'];
const TIPOS = ['CASA', 'APARTAMENTO', 'TERRENO', 'LOCAL_COMERCIAL', 'OFICINA', 'BODEGA', 'FINCA', 'EDIFICIO', 'OTRO'];
const GESTIONES = ['VENTA', 'RENTA', 'AMBAS'];

export class CreateClienteDto {
  @IsString() nombre: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsString() dpi?: string;
  @IsOptional() @IsString() nit?: string;
  @IsOptional() @IsString() direccion?: string;
  @IsOptional() @IsEnum(ORIGENES) origen?: string;
  @IsOptional() @IsString() notas?: string;
  @IsOptional() @IsString() agenteId?: string;
  @IsOptional() @IsBoolean() esPropietario?: boolean;

  // Preferencias de búsqueda
  @IsOptional() @IsEnum(TIPOS) tipoInteres?: string;
  @IsOptional() @IsEnum(GESTIONES) gestionInteres?: string;
  @IsOptional() @Type(() => Number) @IsNumber() presupuestoMax?: number;
  @IsOptional() @IsString() zonaInteres?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) habitacionesMin?: number;
}

export class UpdateClienteDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsString() dpi?: string;
  @IsOptional() @IsString() nit?: string;
  @IsOptional() @IsString() direccion?: string;
  @IsOptional() @IsEnum(ORIGENES) origen?: string;
  @IsOptional() @IsString() notas?: string;
  @IsOptional() @IsString() agenteId?: string;
  @IsOptional() @IsBoolean() esPropietario?: boolean;

  // Preferencias de búsqueda
  @IsOptional() @IsEnum(TIPOS) tipoInteres?: string;
  @IsOptional() @IsEnum(GESTIONES) gestionInteres?: string;
  @IsOptional() @Type(() => Number) @IsNumber() presupuestoMax?: number;
  @IsOptional() @IsString() zonaInteres?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) habitacionesMin?: number;
}

export class FiltrosClienteDto {
  @IsOptional() @IsString() origen?: string;
  @IsOptional() @IsString() busqueda?: string;
  @IsOptional() @IsString() agenteId?: string;
  @IsOptional() @IsBoolean() esPropietario?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}
