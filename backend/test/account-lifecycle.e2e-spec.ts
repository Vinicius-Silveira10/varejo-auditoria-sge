import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';

describe('Account Lifecycle & Session Invalidation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    prisma = app.get(PrismaService);
    await app.init();

    // Login com o seed ADMIN para criar usuários de teste
    const adminLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@fortal.com.br',
        senhaBruta: process.env.SEED_ADMIN_PASSWORD || 'SenhaSegura123!',
      });
    adminToken = adminLoginRes.body.accessToken;
  });

  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { email: { startsWith: 'temp_lifecycle' } } });
    await app.close();
  });

  it('Deve invalidar o acesso após a conta ser desativada no banco (tokenVersion / ativo)', async () => {
    const tempEmail = `temp_lifecycle_${Date.now()}@fortal.com`;
    
    // 1. Cria usuário
    await request(app.getHttpServer())
      .post('/auth/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nome: 'Temp Lifecycle',
        email: tempEmail,
        senhaBruta: 'SenhaSegura123!',
        perfil: 'OPERADOR',
      });

    // 2. Loga para pegar JWT (sessão 1)
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: tempEmail, senhaBruta: 'SenhaSegura123!' });
    const userToken = loginRes.body.accessToken;
    const userId = loginRes.body.user.id;

    // 3. Verifica que JWT funciona (ex: pega ordens)
    const ordersRes = await request(app.getHttpServer())
      .get('/orders')
      .set('Authorization', `Bearer ${userToken}`);
    expect(ordersRes.status).not.toBe(401); // Pode ser 200 ou 403 dependendo das regras, mas não 401

    // 4. Desativa o usuário (simulando DisableUserUseCase via prisma pra não depender da rota exposta)
    await prisma.usuario.update({
      where: { id: userId },
      data: { ativo: false, tokenVersion: { increment: 1 } },
    });

    // 5. Verifica que o MESMO JWT agora é rejeitado instantaneamente
    const ordersResAfterDisable = await request(app.getHttpServer())
      .get('/orders')
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(ordersResAfterDisable.status).toBe(401);
  });
});
