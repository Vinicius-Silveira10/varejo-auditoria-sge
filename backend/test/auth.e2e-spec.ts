import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/infrastructure/database/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);

    await app.init();
    
    // Limpar tabela de usuarios antes dos testes
    await prisma.usuario.deleteMany();
  });

  afterAll(async () => {
    await prisma.usuario.deleteMany();
    await app.close();
  });

  it('/auth/register (POST) - deve registrar um usuario', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({
        nome: 'Vinicius SGE',
        email: 'vini@fortal.com',
        senhaBruta: 'senhaSegura123',
        perfil: 'ADMIN',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.message).toEqual('Usuário registrado com sucesso');
        expect(res.body.data.email).toEqual('vini@fortal.com');
        expect(res.body.data.senha).toBeUndefined();
      });
  });

  it('/auth/login (POST) - deve fazer login e retornar JWT', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'vini@fortal.com',
        senhaBruta: 'senhaSegura123',
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.accessToken).toBeDefined();
        expect(res.body.user.email).toEqual('vini@fortal.com');
      });
  });

  it('/auth/login (POST) - deve falhar com senha errada', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'vini@fortal.com',
        senhaBruta: 'senhaErrada',
      })
      .expect(401);
  });
});
