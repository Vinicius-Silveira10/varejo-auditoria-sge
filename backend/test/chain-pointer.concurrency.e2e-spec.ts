import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';

describe('ChainPointer Concurrency (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let gestorToken: string;
  let produtoId: number;
  let enderecoId: number;
  let loteId1: number;
  let loteId2: number;
  let ajusteId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    // Login as ADMIN 
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@fortal.com.br', senhaBruta: 'SenhaSegura123!' });
    adminToken = loginRes.body.accessToken;
    
    // Login as GESTOR
    const gestorRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'gestor@fortal.com.br', senhaBruta: 'SenhaSegura123!' });
    gestorToken = gestorRes.body.accessToken;

    // Obter produto
    const prod = await prisma.produto.findFirst();
    produtoId = prod!.id;

    // Obter endereco
    const end = await prisma.endereco.findFirst();
    enderecoId = end!.id;
  });

  afterAll(async () => {
    await app.close();
  });
  it('deve manter a integridade da cadeia de hash sob alto stress (5 fluxos paralelos)', async () => {
    // Para evitar serialização no lock do Lote e jogar todo o stress de concorrência 
    // direto para o ChainPointer, vamos criar 5 lotes diferentes.
    const loteIds: number[] = [];
    for (let i = 1; i <= 5; i++) {
      const batchRes = await request(app.getHttpServer())
        .post('/batches')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          numeroLote: `LOTE-STRESS-${i}`,
          produtoId: produtoId,
          quantidade: 100,
          custoAquisicao: 10.5,
          validade: '2030-12-31T00:00:00.000Z',
          evidenciaUrl: 'http://evidence.com/foto.jpg'
        });
      loteIds.push(batchRes.body.data.id);
    }

    // Prepara 5 requisições de movimento, cada uma usando um lote diferente
    const requests = loteIds.map((id) => 
      request(app.getHttpServer())
        .post('/movements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          loteId: id,
          tipo: 'SAIDA',
          quantidade: 1,
          enderecoOrigemId: enderecoId,
          usuarioId: 1, // ADMIN
        })
    );

    // Dispara as 5 requisições EXATAMENTE ao mesmo tempo em paralelo
    const responses = await Promise.all(requests);

    // Verifica que todas foram criadas com sucesso (Nenhuma falhou por concorrência)
    for (const res of responses) {
      expect(res.status).toBe(201);
    }

    // Agora, validamos a integridade da cadeia de Movimentacao via Auditoria
    const auditRes = await request(app.getHttpServer())
      .get('/audit/verify')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(auditRes.status).toBe(200);
    
    const status = auditRes.body.status;
    if (status !== 'INTEGRO') {
      console.log('CORRUPÇÃO DETECTADA NO STRESS TEST:', JSON.stringify(auditRes.body, null, 2));
    }
    
    // Confirma que o BUG-007 (Race condition do ChainPointer) foi corrigido!
    expect(status).toBe('INTEGRO');
  });
});
