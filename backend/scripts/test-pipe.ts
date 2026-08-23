import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
const request = require('supertest');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.init();
  const server = app.getHttpServer();

  console.log('\n--- 2.5 SENHA VAZIA OU CURTA COM PIPE ---');
  const resShort = await request(server).post('/auth/register').send({
    nome: 'Short',
    email: `short1@fortal.com`,
    senhaBruta: '123',
    perfil: 'OPERADOR'
  });
  console.log('Status:', resShort.status);
  console.log('Body:', resShort.body);

  await app.close();
  process.exit(0);
}
bootstrap();
