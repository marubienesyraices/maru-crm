import { IsOptional, IsInt, IsBoolean, Min } from 'class-validator';

export class UpdateCatalogoPlanDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  limite_usuarios?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limite_propiedades?: number;

  @IsOptional()
  @IsBoolean()
  tiene_correo?: boolean;

  @IsOptional()
  @IsBoolean()
  tiene_campanas?: boolean;

  @IsOptional()
  @IsBoolean()
  tiene_portal?: boolean;

  @IsOptional()
  @IsBoolean()
  tiene_sitio_propio?: boolean;

  @IsOptional()
  @IsBoolean()
  tiene_integraciones?: boolean;

  @IsOptional()
  @IsBoolean()
  tiene_meta?: boolean;

  @IsOptional()
  @IsBoolean()
  tiene_mapas?: boolean;

  @IsOptional()
  @IsBoolean()
  tiene_ranking?: boolean;

  @IsOptional()
  @IsBoolean()
  tiene_organigrama?: boolean;
}
