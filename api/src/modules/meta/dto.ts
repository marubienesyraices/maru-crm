import { IsEnum, IsOptional, IsString, MaxLength, IsUrl, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MetaPlataformaDto { FACEBOOK = 'FACEBOOK', INSTAGRAM = 'INSTAGRAM', AMBAS = 'AMBAS' }

export class CreateMetaPublicacionDto {
  @ApiProperty({ enum: MetaPlataformaDto })
  @IsEnum(MetaPlataformaDto)
  plataforma: MetaPlataformaDto;

  @ApiProperty()
  @IsString()
  @MaxLength(63206)
  mensaje: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  propiedad_id?: string;

  @ApiPropertyOptional({ description: 'URL pública de imagen a adjuntar' })
  @IsOptional()
  @IsUrl()
  imagen_url?: string;
}

export class UpdateMetaPublicacionDto {
  @ApiPropertyOptional({ enum: MetaPlataformaDto })
  @IsOptional()
  @IsEnum(MetaPlataformaDto)
  plataforma?: MetaPlataformaDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(63206)
  mensaje?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  imagen_url?: string;
}

export class ProgramarMetaDto {
  @ApiProperty({ description: 'ISO datetime — mínimo 10 min en el futuro' })
  @IsDateString()
  programado_para: string;
}
