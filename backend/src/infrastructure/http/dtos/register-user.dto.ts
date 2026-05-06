import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterUserDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres' })
  senhaBruta: string;

  @IsString()
  @IsNotEmpty()
  perfil: string; // 'ADMIN', 'GESTOR', 'OPERADOR'
}
