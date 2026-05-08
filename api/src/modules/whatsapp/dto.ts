import { IsString, IsOptional, MaxLength } from 'class-validator';

export class EnviarWhatsappDto {
  @IsString()
  telefono: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  mensaje?: string;
}
