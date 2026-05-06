import { IUserRepository } from '../../interfaces/repositories/i-user.repository';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

export interface AuthenticateUserRequest {
  email: string;
  senhaBruta: string;
}

export interface AuthenticateUserResponse {
  accessToken: string;
  user: {
    id: number;
    nome: string;
    email: string;
    perfil: string;
  };
}

export class AuthenticateUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(request: AuthenticateUserRequest): Promise<AuthenticateUserResponse> {
    const user = await this.userRepository.findByEmail(request.email);

    if (!user) {
      throw new Error('RN-USR-002: Credenciais inválidas');
    }

    if (!user.ativo) {
      throw new Error('RN-USR-003: Usuário inativo ou bloqueado');
    }

    const passwordMatch = await bcrypt.compare(request.senhaBruta, user.senha);

    if (!passwordMatch) {
      throw new Error('RN-USR-002: Credenciais inválidas');
    }

    const payload = { sub: user.id, email: user.email, perfil: user.perfil };
    
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        perfil: user.perfil,
      },
    };
  }
}
