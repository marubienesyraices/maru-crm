import { IsString, IsOptional, IsEnum, IsNumber, IsInt, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePropiedadDto {
  @IsString() titulo: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsEnum(['CASA', 'APARTAMENTO', 'TERRENO', 'LOCAL_COMERCIAL', 'OFICINA', 'BODEGA', 'FINCA', 'EDIFICIO', 'OTRO'])
  tipo: string;
  @IsEnum(['VENTA', 'RENTA', 'AMBAS']) gestion: string;

  @IsOptional() @Type(() => Number) @IsNumber() precioVenta?: number;
  @IsOptional() @Type(() => Number) @IsNumber() precioRenta?: number;
  @IsOptional() @IsString() moneda?: string;
  @IsOptional() @Type(() => Number) @IsNumber() comisionPorcentaje?: number;

  @IsOptional() @IsString() pais?: string;
  @IsOptional() @IsString() departamento?: string;
  @IsOptional() @IsString() municipio?: string;
  @IsOptional() @IsString() zona?: string;
  @IsOptional() @IsString() direccion?: string;
  @IsOptional() @Type(() => Number) @IsNumber() latitud?: number;
  @IsOptional() @Type(() => Number) @IsNumber() longitud?: number;

  @IsOptional() @Type(() => Number) @IsNumber() areaTerrenoM2?: number;
  @IsOptional() @Type(() => Number) @IsNumber() areaConstruccionM2?: number;
  @IsOptional() @Type(() => Number) @IsInt() habitaciones?: number;
  @IsOptional() @Type(() => Number) @IsInt() banos?: number;
  @IsOptional() @Type(() => Number) @IsInt() parqueos?: number;
  @IsOptional() @Type(() => Number) @IsInt() niveles?: number;
  @IsOptional() @Type(() => Number) @IsInt() anoConstruccion?: number;
  @IsOptional() amenidades?: string[];

  @IsOptional() @IsUUID() propietarioId?: string;
  @IsOptional() @IsUUID() agenteId?: string;
}

export class UpdatePropiedadDto {
  @IsOptional() @IsString() titulo?: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsOptional() @IsEnum(['CASA', 'APARTAMENTO', 'TERRENO', 'LOCAL_COMERCIAL', 'OFICINA', 'BODEGA', 'FINCA', 'EDIFICIO', 'OTRO'])
  tipo?: string;
  @IsOptional() @IsEnum(['VENTA', 'RENTA', 'AMBAS']) gestion?: string;

  @IsOptional() @Type(() => Number) @IsNumber() precioVenta?: number;
  @IsOptional() @Type(() => Number) @IsNumber() precioRenta?: number;
  @IsOptional() @IsString() moneda?: string;
  @IsOptional() @Type(() => Number) @IsNumber() comisionPorcentaje?: number;

  @IsOptional() @IsString() pais?: string;
  @IsOptional() @IsString() departamento?: string;
  @IsOptional() @IsString() municipio?: string;
  @IsOptional() @IsString() zona?: string;
  @IsOptional() @IsString() direccion?: string;
  @IsOptional() @Type(() => Number) @IsNumber() latitud?: number;
  @IsOptional() @Type(() => Number) @IsNumber() longitud?: number;

  @IsOptional() @Type(() => Number) @IsNumber() areaTerrenoM2?: number;
  @IsOptional() @Type(() => Number) @IsNumber() areaConstruccionM2?: number;
  @IsOptional() @Type(() => Number) @IsInt() habitaciones?: number;
  @IsOptional() @Type(() => Number) @IsInt() banos?: number;
  @IsOptional() @Type(() => Number) @IsInt() parqueos?: number;
  @IsOptional() @Type(() => Number) @IsInt() niveles?: number;
  @IsOptional() @Type(() => Number) @IsInt() anoConstruccion?: number;
  @IsOptional() amenidades?: string[];

  @IsOptional() @IsUUID() propietarioId?: string;
  @IsOptional() @IsUUID() agenteId?: string;
}

export class CambiarEstadoDto {
  @IsEnum(['BORRADOR', 'DISPONIBLE', 'RESERVADA', 'EN_NEGOCIACION', 'VENDIDA', 'RENTADA', 'SUSPENDIDA'])
  nuevoEstado: string;
  @IsOptional() @IsString() motivo?: string;
}

export class FiltrosPropiedadDto {
  @IsOptional() @IsString() tipo?: string;
  @IsOptional() @IsString() gestion?: string;
  @IsOptional() @IsString() estado?: string;
  @IsOptional() @IsString() pais?: string;
  @IsOptional() @IsString() departamento?: string;
  @IsOptional() @IsString() municipio?: string;
  @IsOptional() @Type(() => Number) @IsNumber() precioMin?: number;
  @IsOptional() @Type(() => Number) @IsNumber() precioMax?: number;
  @IsOptional() @Type(() => Number) @IsInt() habitacionesMin?: number;
  @IsOptional() @IsString() busqueda?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}
