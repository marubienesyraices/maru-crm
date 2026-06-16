import { IsOptional, IsString } from 'class-validator';

export class UpdateConfigSistemaDto {
  @IsOptional() @IsString() resend_api_key?: string;
  @IsOptional() @IsString() email_from?: string;
}
