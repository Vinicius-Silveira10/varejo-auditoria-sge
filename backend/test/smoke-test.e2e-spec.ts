import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/infrastructure/http/filters/http-exception.filter';

describe('Smoke Test (Final Validation)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('Health Check: deve retornar status OK e integridade do DB', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
        expect(res.body.checks.database).toBe('up');
      });
  });

  it('Security: deve negar acesso (403) sem token JWT (RolesGuard)', () => {
    return request(app.getHttpServer())
      .get('/orders/dashboard/otif')
      .expect(403);
  });

  it('Global Error Handling: deve retornar erro padronizado para rota inexistente', () => {
    return request(app.getHttpServer())
      .get('/rota-que-nao-existe')
      .expect(404)
      .expect((res) => {
        expect(res.body).toHaveProperty('statusCode', 404);
        expect(res.body).toHaveProperty('timestamp');
        expect(res.body).toHaveProperty('path');
      });
  });

  it('Dashboards: deve estar protegido por Role', async () => {
     return request(app.getHttpServer())
       .get('/orders/dashboard/otif')
       .expect(403); 
  });
});
