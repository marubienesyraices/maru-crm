import { IsString, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, Min } from 'class-validator';

export class CreateInteresDto {
  @IsString() clienteId: string;
  @IsString() propiedadId: string;
  @IsOptional() @IsEnum(['BAJO', 'MEDIO', 'ALTO', 'MUY_ALTO']) nivelInteres?: string;
  @IsOptional() @IsNumber() presupuesto?: number;
  @IsOptional() @IsString() notas?: string;
}

export class CambiarEstadoInteresDto {
  @IsString() nuevoEstado: string;
  @IsOptional() @IsString() motivoPerdida?: string;
  @IsOptional() @IsNumber() precioAcordado?: number;
  @IsOptional() cierreDocumentos?: string[]; // F-16: required when moving to CIERRE
}

export class UpdateInteresDto {
  @IsOptional() @IsEnum(['BAJO', 'MEDIO', 'ALTO', 'MUY_ALTO']) nivelInteres?: string;
  @IsOptional() @IsNumber() presupuesto?: number;
  @IsOptional() @IsString() notas?: string;
}

export class FiltrosPipelineDto {
  @IsOptional() @IsString() estado?: string;
  @IsOptional() @IsString() propiedadId?: string;
  @IsOptional() @IsString() clienteId?: string;
  @IsOptional() @IsString() agenteId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}
