import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from '../../src/infrastructure/database/prisma/prisma.module';
import { ReceiveBatchUseCase } from '../../src/core/use-cases/batch/receive-batch.use-case';
import { PrismaService } from '../../src/infrastructure/database/prisma/prisma.service';
import { IBatchRepository } from '../../src/core/interfaces/repositories/i-batch.repository';
import { IProductRepository } from '../../src/core/interfaces/repositories/i-product.repository';
import { INotaFiscalRepository } from '../../src/core/interfaces/repositories/i-nota-fiscal.repository';
import { IUnitOfWork } from '../../src/core/interfaces/repositories/i-unit-of-work';
import { PrismaBatchRepository } from '../../src/infrastructure/database/prisma/repositories/prisma-batch.repository';
import { PrismaProductRepository } from '../../src/infrastructure/database/prisma/repositories/prisma-product.repository';
import { PrismaNotaFiscalRepository } from '../../src/infrastructure/database/prisma/repositories/prisma-nota-fiscal.repository';
import { PrismaUnitOfWork } from '../../src/infrastructure/database/prisma/prisma-unit-of-work';
import { HashService } from '../../src/infrastructure/security/hash.service';

describe('ReceiveBatchUseCase - Concurrency Test (@code.assure.elite)', () => {
  let useCase: ReceiveBatchUseCase;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [
        HashService,
        PrismaBatchRepository,
        PrismaProductRepository,
        PrismaNotaFiscalRepository,
        {
          provide: 'IUnitOfWork',
          useClass: PrismaUnitOfWork,
        },
        {
          provide: ReceiveBatchUseCase,
          useFactory: (
            productRepo: PrismaProductRepository,
            notaFiscalRepo: PrismaNotaFiscalRepository,
            unitOfWork: IUnitOfWork,
          ) => {
            return new ReceiveBatchUseCase(
              productRepo,
              notaFiscalRepo,
              unitOfWork,
            );
          },
          inject: [
            PrismaProductRepository,
            PrismaNotaFiscalRepository,
            'IUnitOfWork',
          ],
        },
      ],
    }).compile();

    useCase = moduleRef.get<ReceiveBatchUseCase>(ReceiveBatchUseCase);
    prisma = moduleRef.get<PrismaService>(PrismaService);

    const prodBase = await prisma.produto.findUnique({ where: { sku: 'CONC-TEST-001' } });
    if (prodBase) {
      await prisma.logCusto.deleteMany({ where: { produtoId: prodBase.id } });
      await prisma.lote.deleteMany({ where: { produtoId: prodBase.id } });
      await prisma.produto.delete({ where: { id: prodBase.id } });
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('deve processar multiplos recebimentos concorrentes com quantidades e custos DIFERENTES (GAP-009 / Lock Pessimista)', async () => {
    // 1. Criar produto base
    const produto = await prisma.produto.create({
      data: {
        sku: 'CONC-TEST-001',
        descricao: 'Teste de Lock Pessimista Distinto',
        custoMedio: 0.0,
        categoria: 'TESTE',
        ativo: true,
        perecivel: false,
      },
    });

    // 2. Disparar 2 recebimentos simultaneos via Promise.all
    // Entrada A = 10 unidades a R$8,00
    // Entrada B = 5 unidades a R$20,00
    // Total físico esperado: 15 unidades
    // Total financeiro esperado: (10 * 8) + (5 * 20) = 80 + 100 = 180
    // Custo Medio esperado = 180 / 15 = 12.00
    const promessaA = useCase.execute({
      numeroLote: `LOTE-CONC-A`,
      produtoId: produto.id,
      quantidade: 10,
      custoAquisicao: 8.0,
      usuarioId: 1,
    });

    const promessaB = useCase.execute({
      numeroLote: `LOTE-CONC-B`,
      produtoId: produto.id,
      quantidade: 5,
      custoAquisicao: 20.0,
      usuarioId: 1,
    });

    await Promise.all([promessaA, promessaB]);

    // 3. Validar estado final
    const produtoFinal = await prisma.produto.findUnique({
      where: { id: produto.id },
    });

    expect(produtoFinal).toBeDefined();
    expect(produtoFinal!.custoMedio).toBe(12.0); // CMP Exato (80 + 100) / 15

    const lotes = await prisma.lote.findMany({
      where: { produtoId: produto.id },
    });

    expect(lotes).toHaveLength(2);
    const quantidadeTotal = lotes.reduce((acc, l) => acc + l.quantidade, 0);
    expect(quantidadeTotal).toBe(15);
  });
});
