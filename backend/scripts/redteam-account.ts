import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
const request = require('supertest');
import { INestApplication } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.init();
  const server = app.getHttpServer();

  console.log('\n--- 2.1 REGISTRO COMO ADMIN ---');
  const rand = Date.now();
  const res1 = await request(server).post('/auth/register').send({
    nome: 'Attacker Admin',
    email: `hacker${rand}@fortal.com`,
    senhaBruta: 'senha123',
    perfil: 'ADMIN'
  });
  console.log('Status:', res1.status);
  console.log('Body:', res1.body);

  console.log('\n--- 2.4 TIMING ATTACK ENUMERATION ---');
  const start1 = Date.now();
  const resNotExist = await request(server).post('/auth/login').send({ email: `nao_existe${rand}@fortal.com`, senhaBruta: 'errada123' });
  const timeNotExist = Date.now() - start1;
  
  const start2 = Date.now();
  const resExist = await request(server).post('/auth/login').send({ email: `hacker${rand}@fortal.com`, senhaBruta: 'errada123' });
  const timeExist = Date.now() - start2;
  
  console.log('Login inexistente - Status:', resNotExist.status, 'Tempo:', timeNotExist, 'ms');
  console.log('Login com senha errada - Status:', resExist.status, 'Tempo:', timeExist, 'ms');

  console.log('\n--- 2.5 SENHA VAZIA OU CURTA ---');
  const resShort = await request(server).post('/auth/register').send({
    nome: 'Short',
    email: `short${rand}@fortal.com`,
    senhaBruta: '123',
    perfil: 'OPERADOR'
  });
  console.log('Status Short Password:', resShort.status);
  console.log('Body:', resShort.body);

  console.log('\n--- 2.6 REGISTRO DUPLICADO ---');
  const resDup = await request(server).post('/auth/register').send({
    nome: 'Attacker Dup',
    email: `hacker${rand}@fortal.com`,
    senhaBruta: 'senha123',
    perfil: 'OPERADOR'
  });
  console.log('Status Dup:', resDup.status);
  console.log('Body:', resDup.body);

  await app.close();
  process.exit(0);
}

bootstrap();
