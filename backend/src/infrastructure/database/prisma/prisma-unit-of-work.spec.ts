import { Test, TestingModule } from '@nestjs/testing';
import { PrismaUnitOfWork } from './prisma-unit-of-work';
import { PrismaService } from './prisma.service';
import { ConflictException } from '../../../core/exceptions/domain.exception';
import { HashService } from '../../security/hash.service';

describe('PrismaUnitOfWork', () => {
  let unitOfWork: PrismaUnitOfWork;
  let prismaService: PrismaService;

  beforeEach(async () => {
    // Mock the PrismaService with a simulated $transaction
    const mockPrismaService = {
      $transaction: jest.fn().mockImplementation(async (callback) => {
        // Prisma's real behavior on rollback wraps/destroys the error prototype sometimes.
        // We simulate a rollback by executing the callback.
        // Since we are mocking, we don't naturally destroy the prototype here, but our 
        // test proves that the logic inside PrismaUnitOfWork (the try/catch interceptor)
        // correctly catches and re-throws the exact instance out of the $transaction promise.
        try {
          await callback({});
        } catch (error) {
          // Simulate Prisma losing the prototype by explicitly throwing a generic Error
          // if we hadn't intercepted it. (Our UOW intercepts it before this happens though!)
          // Actually, our UOW intercepts it INSIDE the callback, so the callback itself throws.
          // The $transaction just rethrows whatever the callback threw.
          throw new Error('Simulated Prisma Transaction Failure: ' + (error as any).message);
        }
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaUnitOfWork,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: HashService,
          useValue: { generateHash: jest.fn() },
        },
      ],
    }).compile();

    unitOfWork = module.get<PrismaUnitOfWork>(PrismaUnitOfWork);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('deve repassar a instância original da exceção customizada (ConflictException) sem perder o prototype', async () => {
    const errorInstance = new ConflictException('Teste de Conflito UOW');

    try {
      await unitOfWork.execute(async (ctx) => {
        throw errorInstance;
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      // Confirma que a exceção chegou como instância exata da classe ConflictException
      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).message).toBe('Teste de Conflito UOW');
      // Confirma que não é o erro genérico do Prisma que colocamos no mock
      expect((error as Error).message).not.toContain('Simulated Prisma Transaction Failure');
    }
  });
});
