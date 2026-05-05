import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateVisitaDto {
  @IsString()
  interesId: string;

  @IsDateString()
  fechaInicio: string;

  @IsDateString()
  fechaFin: string;

  @IsOptional()
  @IsString()
  ubicacion?: string;

  @IsOptional()
  @IsString()
  notas?: string;
}

export class UpdateVisitaDto {
  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @IsOptional()
  @IsString()
  ubicacion?: string;

  @IsOptional()
  @IsString()
  notas?: string;

  @IsOptional()
  @IsIn(['PENDIENTE', 'CONFIRMADA', 'CANCELADA', 'REALIZADA'])
  estado?: string;
}

export class FiltrosVisitaDto {
  from?: string;
  to?: string;
  agenteId?: string;
  interesId?: string;
  estado?: string;
}

export class ReporteVisitaDto {
  @IsOptional()
  @IsString()
  notas?: string;

  @IsOptional()
  @IsString()
  nivelInteres?: string;

  @IsOptional()
  @IsString()
  reaccion?: string;

  @IsOptional()
  @IsString()
  siguientePaso?: string;
}

export class AccionReprogramarDto {
  @IsIn(['CONFIRMAR', 'REPROGRAMAR', 'CANCELAR'])
  accion: 'CONFIRMAR' | 'REPROGRAMAR' | 'CANCELAR';

  @IsOptional()
  @IsDateString()
  fecha_inicio?: string;

  @IsOptional()
  @IsDateString()
  fecha_fin?: string;

  @IsOptional()
  @IsString()
  notas?: string;
}
