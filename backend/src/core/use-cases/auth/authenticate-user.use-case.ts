import { IUserRepository } from '../../interfaces/repositories/i-user.repository';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { DomainException } from '../../exceptions/domain.exception';

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
  private static cachedDummyHash: string | null = null;

  private static getFallbackDummyHash(): string {
    if (!this.cachedDummyHash) {
      this.cachedDummyHash = bcrypt.hashSync('dummy_timing_salt', 10);
    }
    return this.cachedDummyHash;
  }

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(
    request: AuthenticateUserRequest,
  ): Promise<AuthenticateUserResponse> {
    const user = await this.userRepository.findByEmail(request.email);

    // Hash dummy para proteção de Timing Attack sem expor hash hardcoded no código
    const dummyHash = process.env.AUTH_DUMMY_HASH || AuthenticateUserUseCase.getFallbackDummyHash();

    if (!user) {
      await bcrypt.compare(request.senhaBruta, dummyHash);
      throw new DomainException('RN-USR-002: Credenciais inválidas');
    }

    if (!user.ativo) {
      throw new DomainException('RN-USR-003: Usuário inativo ou bloqueado');
    }

    const passwordMatch = await bcrypt.compare(request.senhaBruta, user.senha);

    if (!passwordMatch) {
      throw new DomainException('RN-USR-002: Credenciais inválidas');
    }

    const payload = { 
      sub: user.id, 
      email: user.email, 
      perfil: user.perfil,
      tokenVersion: user.tokenVersion
    };

    // Atualizar data/hora do último login bem-sucedido (segurança / LGPD) (RN-REL-003)
    await this.userRepository.updateUltimoAcesso(user.id, new Date());

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
