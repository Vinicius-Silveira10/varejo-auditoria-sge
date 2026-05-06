import { IUserRepository } from '../../interfaces/repositories/i-user.repository';
import { Usuario } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export interface RegisterUserRequest {
  nome: string;
  email: string;
  senhaBruta: string;
  perfil: string;
}

export class RegisterUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(request: RegisterUserRequest): Promise<Omit<Usuario, 'senha'>> {
    const existingUser = await this.userRepository.findByEmail(request.email);
    
    if (existingUser) {
      throw new Error(`RN-USR-001: Email ${request.email} já está em uso`);
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(request.senhaBruta, saltRounds);

    const createdUser = await this.userRepository.create({
      nome: request.nome,
      email: request.email,
      senha: hashedPassword,
      perfil: request.perfil,
    });

    // Remove a senha antes de retornar para evitar vazamento
    const { senha, ...userWithoutPassword } = createdUser;
    return userWithoutPassword;
  }
}
