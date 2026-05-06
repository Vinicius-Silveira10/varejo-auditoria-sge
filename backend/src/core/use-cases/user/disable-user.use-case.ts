import { IUserRepository } from '../../interfaces/repositories/i-user.repository';

export class DisableUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(userId: number) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new Error('Usuário não encontrado.');
    }

    if (!user.ativo) {
      throw new Error('Usuário já está desativado.');
    }

    return this.userRepository.disable(userId);
  }
}
