process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRATION = '1h';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../app.module';
import { PrismaService } from '../../database/prisma/prisma.service';
import { GlobalExceptionFilter } from '../filters/http-exception.filter';
import { JwtService } from '@nestjs/jwt';

describe('GetOrders (e2e) - RBAC & Pagination', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let authToken: string;

  beforeAll(async () => {
    const mockPrismaService = {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      $transaction: jest.fn().mockResolvedValue([[], 0]),
      pedidoExpedicao: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      usuario: {
        findUnique: jest.fn().mockResolvedValue({ ativo: true, tokenVersion: 0, perfil: 'OPERADOR', email: 'e2e-getorders@fortal.com' })
      }
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new GlobalExceptionFilter());
    jwtService = app.get(JwtService);
    await app.init();

    authToken = jwtService.sign(
      {
        sub: 999,
        email: 'e2e-getorders@fortal.com',
        perfil: 'OPERADOR',
        tokenVersion: 0
      },
      { secret: process.env.JWT_SECRET || 'test-secret' }
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /orders - Deve retornar 401 sem token (JwtAuthGuard)', () => {
    return request(app.getHttpServer())
      .get('/orders')
      .expect(401);
  });

  it('GET /orders - Deve retornar 401 com token invalido (JwtAuthGuard)', () => {
    return request(app.getHttpServer())
      .get('/orders')
      .set('Authorization', `Bearer invalid-token`)
      .expect(401);
  });

  it('GET /orders - Deve retornar 200 e estrutura de paginacao com token valido (RolesGuard)', async () => {
    const res = await request(app.getHttpServer())
      .get('/orders?page=1&limit=5')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('meta');
    expect(res.body.meta).toHaveProperty('total');
    expect(res.body.meta).toHaveProperty('page', 1);
    expect(res.body.meta).toHaveProperty('limit', 5);
  });
});
