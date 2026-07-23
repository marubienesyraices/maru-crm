import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BrochureSeccionDto {
  @IsString() id: string;
  @IsString() label: string;
  @IsBoolean() visible: boolean;
  @IsNumber() @Min(1) order: number;
}

export class UpdateBrochureConfigDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BrochureSeccionDto)
  secciones?: BrochureSeccionDto[];

  @IsOptional() @IsString() footer_texto?: string;
  @IsOptional() @IsString() watermark_texto?: string;
}

export class UpdateCartaPlantillaDto {
  @IsString() plantilla_html: string;
}
