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

  console.log('\n=============================================');
  console.log(' RED TEAM - RE-TESTE DE ELEVAÇÃO DE PRIVILÉGIO');
  console.log('=============================================\n');

  const rand = Date.now();

  console.log('--- 1. TENTATIVA ANÔNIMA (SEM TOKEN) ---');
  const resAnonymous = await request(server).post('/auth/register').send({
    nome: 'Anonymous Attacker',
    email: `anon${rand}@fortal.com`,
    senhaBruta: 'senha123',
    perfil: 'ADMIN'
  });
  console.log(`Status Recebido: ${resAnonymous.status} (Esperado: 401)`);
  if (resAnonymous.status !== 401) console.log(resAnonymous.body);

  console.log('\n--- 2. TENTATIVA COMO GESTOR (TENTANDO ELEVAÇÃO) ---');
  // Obter token de GESTOR
  const resLoginGestor = await request(server).post('/auth/login').send({
    email: 'gestor@fortal.com.br',
    senhaBruta: 'SenhaSegura123!'
  });
  const tokenGestor = resLoginGestor.body.accessToken;

  const resGestor = await request(server).post('/auth/register')
    .set('Authorization', `Bearer ${tokenGestor}`)
    .send({
      nome: 'Gestor Malicioso',
      email: `gestor_malicioso${rand}@fortal.com`,
      senhaBruta: 'senha123',
      perfil: 'ADMIN'
    });
  
  console.log(`Status Recebido: ${resGestor.status}`);
  console.log(`Perfil Resultante no Banco: ${resGestor.body?.data?.perfil} (Esperado: OPERADOR)`);

  console.log('\n--- 3. CRIAÇÃO LEGÍTIMA COMO ADMIN ---');
  // Obter token de ADMIN
  const resLoginAdmin = await request(server).post('/auth/login').send({
    email: 'admin@fortal.com.br',
    senhaBruta: 'SenhaSegura123!'
  });
  const tokenAdmin = resLoginAdmin.body.accessToken;

  const resAdmin = await request(server).post('/auth/register')
    .set('Authorization', `Bearer ${tokenAdmin}`)
    .send({
      nome: 'Admin Legítimo',
      email: `admin_novo${rand}@fortal.com`,
      senhaBruta: 'senha123',
      perfil: 'GESTOR'
    });
  
  console.log(`Status Recebido: ${resAdmin.status}`);
  console.log(`Perfil Resultante no Banco: ${resAdmin.body?.data?.perfil} (Esperado: GESTOR)`);

  console.log('\n=============================================');
  await app.close();
  process.exit(0);
}
bootstrap();
