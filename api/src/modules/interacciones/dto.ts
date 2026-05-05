import { IsEnum, IsOptional, IsString, IsInt, Min, IsISO8601 } from 'class-validator';
import { Type } from 'class-transformer';

const TIPOS = ['LLAMADA', 'VISITA', 'MENSAJE', 'NOTA', 'WHATSAPP', 'EMAIL'] as const;
const RESULTADOS = ['POSITIVO', 'NEUTRO', 'NEGATIVO', 'SIN_RESPUESTA'] as const;

export class CreateInteraccionDto {
  @IsString() interesId: string;
  @IsEnum(TIPOS) tipo: string;
  @IsOptional() @IsEnum(RESULTADOS) resultado?: string;
  @IsOptional() @IsString() notas?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) duracionMin?: number;
  @IsOptional() @IsISO8601() fecha?: string;
}
