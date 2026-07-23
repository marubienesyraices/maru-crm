import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsInt,
  IsUUID,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePropiedadDto {
  @IsString() titulo: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsEnum([
    'CASA',
    'APARTAMENTO',
    'TERRENO',
    'LOCAL_COMERCIAL',
    'OFICINA',
    'BODEGA',
    'FINCA',
    'EDIFICIO',
    'OTRO',
  ])
  tipo: string;
  @IsEnum(['VENTA', 'RENTA', 'AMBAS']) gestion: string;

  @IsOptional() @IsBoolean() mostrarEnMapaCrm?: boolean;
  @IsOptional() @IsBoolean() mostrarEnPortal?: boolean;

  @IsOptional() @Type(() => Number) @IsNumber() precioVenta?: number;
  @IsOptional() @Type(() => Number) @IsNumber() precioRenta?: number;
  @IsOptional() @IsString() moneda?: string;
  @IsOptional() @Type(() => Number) @IsNumber() comisionPorcentaje?: number;

  @IsOptional() @IsString() pais?: string | null;
  @IsOptional() @IsString() departamento?: string | null;
  @IsOptional() @IsString() municipio?: string | null;
  @IsOptional() @IsString() zona?: string | null;
  @IsOptional() @IsString() direccion?: string | null;
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
  @IsOptional()
  @IsEnum([
    'CASA',
    'APARTAMENTO',
    'TERRENO',
    'LOCAL_COMERCIAL',
    'OFICINA',
    'BODEGA',
    'FINCA',
    'EDIFICIO',
    'OTRO',
  ])
  tipo?: string;
  @IsOptional() @IsEnum(['VENTA', 'RENTA', 'AMBAS']) gestion?: string;

  @IsOptional() @IsBoolean() mostrarEnMapaCrm?: boolean;
  @IsOptional() @IsBoolean() mostrarEnPortal?: boolean;

  @IsOptional() @Type(() => Number) @IsNumber() precioVenta?: number;
  @IsOptional() @Type(() => Number) @IsNumber() precioRenta?: number;
  @IsOptional() @IsString() moneda?: string;
  @IsOptional() @Type(() => Number) @IsNumber() comisionPorcentaje?: number;

  @IsOptional() @IsString() pais?: string | null;
  @IsOptional() @IsString() departamento?: string | null;
  @IsOptional() @IsString() municipio?: string | null;
  @IsOptional() @IsString() zona?: string | null;
  @IsOptional() @IsString() direccion?: string | null;
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
  @IsEnum([
    'BORRADOR',
    'DISPONIBLE',
    'RESERVADA',
    'EN_NEGOCIACION',
    'VENDIDA',
    'RENTADA',
    'SUSPENDIDA',
  ])
  nuevoEstado: string;
  @IsOptional() @IsString() motivo?: string;
}

export class PrecioSugeridoQueryDto {
  @IsOptional() @Type(() => Number) @IsNumber() lat?: number;
  @IsOptional() @Type(() => Number) @IsNumber() lng?: number;
  @IsEnum([
    'CASA',
    'APARTAMENTO',
    'TERRENO',
    'LOCAL_COMERCIAL',
    'OFICINA',
    'BODEGA',
    'FINCA',
    'EDIFICIO',
    'OTRO',
  ])
  tipo: string;
  @IsEnum(['VENTA', 'RENTA', 'AMBAS']) gestion: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  radioKm?: number;
  @IsOptional() @IsString() departamento?: string;
  @IsOptional() @IsUUID() excludeId?: string;
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
