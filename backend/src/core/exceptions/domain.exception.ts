/**
 * Exceção de domínio: representa violações de regras de negócio (RNs).
 * Deve ser lançada nos use cases em vez de `throw new Error()` para
 * garantir que o GlobalExceptionFilter mapeie para HTTP 400 (Bad Request)
 * em vez de 500 (Internal Server Error).
 *
 * Os use cases do core NÃO devem importar nada do NestJS (@nestjs/*).
 * O filter é responsável por traduzir esta exceção para a resposta HTTP adequada.
 */
export class DomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainException';
  }
}

/**
 * Exceção de domínio para recurso não encontrado (HTTP 404).
 */
export class NotFoundException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundException';
  }
}

/**
 * Exceção de domínio para conflito/estado inválido (HTTP 409 / 422).
 */
export class ConflictException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictException';
  }
}
