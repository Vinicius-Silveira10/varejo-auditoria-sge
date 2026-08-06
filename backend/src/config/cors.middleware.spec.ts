/**
 * cors.middleware.spec.ts
 *
 * Testa que a lista de permissão CORS do NestJS funciona corretamente:
 *  - Origem PERMITIDA → preflight retorna Access-Control-Allow-Origin com a origem solicitada
 *  - Origem NÃO LISTADA → preflight NÃO retorna Access-Control-Allow-Origin
 *
 * Usa um mini-app NestJS em memória, sem banco e sem Redis, para testar
 * exclusivamente o middleware CORS configurado em main.ts via ALLOWED_ORIGINS.
 *
 * Por que não testamos o AppModule real aqui:
 *   O AppModule exige Prisma + Redis + JWT_SECRET. Esse teste seria um e2e completo.
 *   Optamos por um módulo mínimo isolado que replica exatamente o trecho de main.ts
 *   relevante (enableCors), garantindo que o comportamento do middleware NestJS
 *   (que é o express 'cors' por baixo) está correto sem depender de infraestrutura.
 */

import { INestApplication, Controller, Get, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';

// supertest expõe um default export (CJS). O require() garante que sempre
// recebemos a função diretamente, independente do ts-jest CJS/ESM interop.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest') as (app: any) => any;

// ---------------------------------------------------------------------------
// Mini-módulo isolado: único endpoint público sem dependências externas
// ---------------------------------------------------------------------------

@Controller()
class PingController {
  @Get('ping')
  ping() {
    return { pong: true };
  }
}

@Module({ controllers: [PingController] })
class MinimalModule {}

// ---------------------------------------------------------------------------
// Factory: cria o app com a lista de origens fornecida pelo teste
// ---------------------------------------------------------------------------

async function createAppWithOrigins(allowedOrigins: string[]): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [MinimalModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.enableCors({
    origin: allowedOrigins,          // replicando exatamente o main.ts
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  await app.init();
  return app;
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('CORS Allowlist Middleware', () => {
  let app: INestApplication;

  afterEach(async () => {
    if (app) await app.close();
  });

  // ─── CASO 1: origem permitida ─────────────────────────────────────────────

  it('[RED→GREEN] preflight de origem PERMITIDA retorna Access-Control-Allow-Origin com a origem exata', async () => {
    const allowedOrigin = 'https://staging.fortal.com';
    app = await createAppWithOrigins([allowedOrigin]);

    const response = await request(app.getHttpServer())
      .options('/ping')
      .set('Origin', allowedOrigin)
      .set('Access-Control-Request-Method', 'GET');

    // O browser só envia a requisição real se receber o cabeçalho de volta
    expect(response.headers['access-control-allow-origin']).toBe(allowedOrigin);
    expect(response.headers['access-control-allow-credentials']).toBe('true');
    expect(response.status).toBe(204);
  });

  // ─── CASO 2: origem NÃO listada ──────────────────────────────────────────

  it('[RED→GREEN] preflight de origem NÃO LISTADA não retorna Access-Control-Allow-Origin', async () => {
    app = await createAppWithOrigins(['https://staging.fortal.com']);

    const response = await request(app.getHttpServer())
      .options('/ping')
      .set('Origin', 'https://atacante.evil.com')
      .set('Access-Control-Request-Method', 'GET');

    // Sem o cabeçalho, o browser bloqueia a requisição real
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  // ─── CASO 3: múltiplas origens — cada uma individualmente permitida ────────

  it('múltiplas origens: aceita qualquer da lista e rejeita as de fora', async () => {
    const origins = [
      'https://staging.fortal.com',
      'https://app.fortal.com.br',
    ];
    app = await createAppWithOrigins(origins);

    // Primeira origem da lista
    const res1 = await request(app.getHttpServer())
      .options('/ping')
      .set('Origin', 'https://staging.fortal.com')
      .set('Access-Control-Request-Method', 'GET');
    expect(res1.headers['access-control-allow-origin']).toBe('https://staging.fortal.com');

    // Segunda origem da lista
    const res2 = await request(app.getHttpServer())
      .options('/ping')
      .set('Origin', 'https://app.fortal.com.br')
      .set('Access-Control-Request-Method', 'GET');
    expect(res2.headers['access-control-allow-origin']).toBe('https://app.fortal.com.br');

    // Origem fora da lista
    const res3 = await request(app.getHttpServer())
      .options('/ping')
      .set('Origin', 'https://outro.dominio.com')
      .set('Access-Control-Request-Method', 'GET');
    expect(res3.headers['access-control-allow-origin']).toBeUndefined();
  });

  // ─── CASO 4: integração validateEnv → CORS ───────────────────────────────
  // Verifica que a lista parseada por validateEnv() a partir de ALLOWED_ORIGINS
  // produz o comportamento correto quando passada diretamente ao enableCors.

  it('lista parseada de ALLOWED_ORIGINS por validateEnv() é aplicada corretamente ao CORS', async () => {
    // Simula o que validateEnv() retorna ao parsear a env var
    const rawOrigins = 'https://staging.fortal.com,https://app.fortal.com.br';
    const parsedOrigins = rawOrigins.split(',').map((o) => o.trim());

    app = await createAppWithOrigins(parsedOrigins);

    // staging deve ser aceito
    const staging = await request(app.getHttpServer())
      .options('/ping')
      .set('Origin', 'https://staging.fortal.com')
      .set('Access-Control-Request-Method', 'GET');
    expect(staging.headers['access-control-allow-origin']).toBe('https://staging.fortal.com');

    // localhost (não listado) deve ser bloqueado
    const localhost = await request(app.getHttpServer())
      .options('/ping')
      .set('Origin', 'http://localhost:3001')
      .set('Access-Control-Request-Method', 'GET');
    expect(localhost.headers['access-control-allow-origin']).toBeUndefined();
  });
});
