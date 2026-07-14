import { IUserRepository } from '../../interfaces/repositories/i-user.repository';
import { DomainException, NotFoundException } from '../../exceptions/domain.exception';

export class DisableUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(userId: number) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    if (!user.ativo) {
      throw new DomainException('Usuário já está desativado.');
    }

    return this.userRepository.disable(userId);
  }
}
