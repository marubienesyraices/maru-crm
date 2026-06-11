import { IsEmail, IsNotEmpty, IsOptional, IsString, IsEnum, IsIn, IsUUID } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString() @IsNotEmpty()
  nombre: string;

  @IsString() @IsNotEmpty()
  rol: string;

  @IsOptional() @IsString()
  idSupervisor?: string;
}

export class UpdateUserDto {
  @IsOptional() @IsEmail()
  email?: string;

  @IsOptional() @IsString()
  nombre?: string;

  @IsOptional() @IsString()
  rol?: string;

  @IsOptional() @IsString()
  estado?: string;

  @IsOptional() @IsString()
  idSupervisor?: string;
}

export class UpdateTemaDto {
  @IsString() @IsIn(['oscuro', 'claro'])
  tema: 'oscuro' | 'claro';
}

export class CreateAdminDto {
  @IsEmail()
  email: string;

  @IsString() @IsNotEmpty()
  nombre: string;

  @IsUUID('all')
  tenantId: string;
}

export class UpdateAdminDto {
  @IsOptional() @IsEmail()
  email?: string;

  @IsOptional() @IsString()
  nombre?: string;

  @IsOptional() @IsString()
  estado?: string;

  @IsOptional() @IsString()
  tenantId?: string;
}
