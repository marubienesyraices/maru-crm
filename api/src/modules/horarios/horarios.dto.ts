import { IsInt, IsString, IsBoolean, IsOptional, IsArray, Min, Max, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertHorarioDto {
  @IsInt()
  @Min(0)
  @Max(6)
  diaSemana: number;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'horaInicio must be HH:MM' })
  horaInicio: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'horaFin must be HH:MM' })
  horaFin: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class BulkUpsertHorariosDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertHorarioDto)
  horarios: UpsertHorarioDto[];
}
