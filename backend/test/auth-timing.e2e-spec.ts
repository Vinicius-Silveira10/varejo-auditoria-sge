import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from './../src/app.module';

describe('Auth Timing (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve ter diferença de tempo < 15ms entre usuário inexistente e senha incorreta', async () => {
    // Aquecimento (Warm-up) do bcrypt/roteamento
    await request(app.getHttpServer()).post('/auth/login').send({ email: 'warmup@fortal.com', senhaBruta: '123' });

    // Cenário 1: Usuário não existe
    const startInexistente = performance.now();
    await request(app.getHttpServer()).post('/auth/login').send({
      email: 'nao.existe.mesmo@fortal.com.br',
      senhaBruta: 'SenhaSegura123!',
    });
    const timeInexistente = performance.now() - startInexistente;

    // Cenário 2: Usuário existe, mas senha incorreta
    // (O admin já existe pelo seed: admin@fortal.com.br)
    const startSenhaIncorreta = performance.now();
    await request(app.getHttpServer()).post('/auth/login').send({
      email: 'admin@fortal.com.br',
      senhaBruta: 'SenhaIncorreta123!',
    });
    const timeSenhaIncorreta = performance.now() - startSenhaIncorreta;

    const diff = Math.abs(timeInexistente - timeSenhaIncorreta);

    console.log(`[Timing] Inexistente: ${timeInexistente.toFixed(2)}ms | Senha Incorreta: ${timeSenhaIncorreta.toFixed(2)}ms | Diff: ${diff.toFixed(2)}ms`);

    expect(diff).toBeLessThan(15);
  });
});
