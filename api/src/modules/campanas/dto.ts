export class CreatePlantillaDto {
  nombre: string;
  asunto: string;
  cuerpo_html: string;
}

export class UpdatePlantillaDto {
  nombre?: string;
  asunto?: string;
  cuerpo_html?: string;
}

export class CreateCampanaDto {
  nombre: string;
  plantilla_id: string;
  filtro_rol?: string[];
  variables_data?: Record<string, string>;
}

export class UpdateCampanaDto {
  nombre?: string;
  plantilla_id?: string;
  filtro_rol?: string[];
  variables_data?: Record<string, string>;
}
