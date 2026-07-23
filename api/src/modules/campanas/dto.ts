import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreatePlantillaDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  asunto: string;

  @IsString()
  @IsNotEmpty()
  cuerpo_html: string;
}

export class UpdatePlantillaDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombre?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  asunto?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  cuerpo_html?: string;
}

export class CreateCampanaDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsUUID()
  plantilla_id: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  filtro_rol?: string[];

  @IsOptional()
  @IsObject()
  variables_data?: Record<string, string>;
}

export class UpdateCampanaDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombre?: string;

  @IsOptional()
  @IsUUID()
  plantilla_id?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  filtro_rol?: string[];

  @IsOptional()
  @IsObject()
  variables_data?: Record<string, string>;
}
