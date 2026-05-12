import { Test, TestingModule } from '@nestjs/testing';
import { PrismaOrderRepository } from './prisma-order.repository';
import { PrismaService } from '../prisma.service';

describe('PrismaOrderRepository', () => {
  let repository: PrismaOrderRepository;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaOrderRepository, PrismaService],
    }).compile();

    repository = module.get<PrismaOrderRepository>(PrismaOrderRepository);
    prisma = module.get<PrismaService>(PrismaService);

    // Limpar tabelas necessárias
    await prisma.itemPedido.deleteMany();
    await prisma.pedidoExpedicao.deleteMany();
    await prisma.logCusto.deleteMany();
    await prisma.produto.deleteMany();
    await prisma.usuario.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('deve criar um pedido com itens no banco', async () => {
    // Criar produto primeiro
    const produto = await prisma.produto.create({
      data: {
        sku: 'SKU-ORDER-TEST',
        descricao: 'Produto Teste Pedido',
        categoria: 'Teste',
        perecivel: false,
        custoMedio: 10,
        ativo: true,
      },
    });

    const pedido = await repository.create({
      codigoPedido: 'PED-1001',
      itens: [
        {
          produtoId: produto.id,
          quantidadeSolicitada: 5,
        },
      ],
    });

    expect(pedido.id).toBeDefined();
    expect(pedido.codigoPedido).toBe('PED-1001');
    expect(pedido.status).toBe('PENDENTE');
    expect(pedido.itens).toHaveLength(1);
    expect(pedido.itens[0].quantidadeSolicitada).toBe(5);
    expect(pedido.itens[0].quantidadeSeparada).toBe(0);
  });

  it('deve buscar um pedido com itens pelo ID', async () => {
    const produto = await prisma.produto.create({
      data: {
        sku: 'SKU-ORDER-TEST-2',
        descricao: 'Produto',
        categoria: 'C',
      },
    });

    const criado = await repository.create({
      codigoPedido: 'PED-1002',
      itens: [{ produtoId: produto.id, quantidadeSolicitada: 10 }],
    });

    const buscado = await repository.findById(criado.id);
    expect(buscado).toBeDefined();
    expect(buscado?.id).toBe(criado.id);
    expect(buscado?.itens).toHaveLength(1);
  });

  it('deve retornar null para ID inexistente', async () => {
    const buscado = await repository.findById(99999);
    expect(buscado).toBeNull();
  });

  it('deve atualizar o status de um pedido', async () => {
    const produto = await prisma.produto.create({
      data: { sku: 'SKU-ORDER-TEST-3', descricao: 'P', categoria: 'C' },
    });

    const criado = await repository.create({
      codigoPedido: 'PED-1003',
      itens: [{ produtoId: produto.id, quantidadeSolicitada: 1 }],
    });

    const atualizado = await repository.updateStatus(criado.id, 'SEPARACAO');
    
    expect(atualizado.id).toBe(criado.id);
    expect(atualizado.status).toBe('SEPARACAO');
  });

  it('deve atualizar os conferentes e marcar como CONFERIDO', async () => {
    const produto = await prisma.produto.create({
      data: { sku: 'SKU-ORDER-TEST-4', descricao: 'P', categoria: 'C' },
    });

    const uniqueId = Date.now();
    const usuario1 = await prisma.usuario.create({
      data: { nome: 'U1', email: `u1_${uniqueId}@teste.com`, senha: '123', perfil: 'OPERADOR' }
    });

    const usuario2 = await prisma.usuario.create({
      data: { nome: 'U2', email: `u2_${uniqueId}@teste.com`, senha: '123', perfil: 'GESTOR' }
    });

    const criado = await repository.create({
      codigoPedido: 'PED-1004',
      valorTotal: 15000,
      itens: [{ produtoId: produto.id, quantidadeSolicitada: 1 }],
    });

    const atualizado = await repository.updateConferentes(criado.id, usuario1.id, usuario2.id);

    expect(atualizado.status).toBe('CONFERIDO');
    expect(atualizado.conferente1Id).toBe(usuario1.id);
    expect(atualizado.conferente2Id).toBe(usuario2.id);
  });
});
