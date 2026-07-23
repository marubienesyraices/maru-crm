import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  MaxLength,
} from 'class-validator';

export enum EstadoTarea {
  PENDIENTE = 'PENDIENTE',
  EN_PROGRESO = 'EN_PROGRESO',
  COMPLETADA = 'COMPLETADA',
}

export enum PrioridadTarea {
  BAJA = 'BAJA',
  MEDIA = 'MEDIA',
  ALTA = 'ALTA',
}

export class CreateTareaDto {
  @IsString()
  @MaxLength(200)
  titulo: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descripcion?: string;

  @IsOptional()
  @IsEnum(PrioridadTarea)
  prioridad?: PrioridadTarea;

  @IsOptional()
  @IsDateString()
  fechaLimite?: string;
}

export class UpdateTareaDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titulo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descripcion?: string;

  @IsOptional()
  @IsEnum(EstadoTarea)
  estado?: EstadoTarea;

  @IsOptional()
  @IsEnum(PrioridadTarea)
  prioridad?: PrioridadTarea;

  @IsOptional()
  @IsDateString()
  fechaLimite?: string;
}
