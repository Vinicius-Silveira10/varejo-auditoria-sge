import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
const request = require('supertest');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.init();
  const server = app.getHttpServer();
  const prisma = app.get(PrismaService);

  console.log('\n=====================================================================');
  console.log('BLOCO 2 — RED TEAM: TENTATIVAS REAIS DE ATAQUE (NOVO ESTADO)');
  console.log('=====================================================================\n');

  // Preparação: Logar como ADMIN para os testes autorizados
  const adminLogin = await request(server).post('/auth/login').send({
    email: 'admin@fortal.com.br',
    senhaBruta: 'SenhaSegura123!'
  });
  const adminToken = adminLogin.body.accessToken;

  // 2.1 Tentar registrar uma conta anônima forçando ADMIN
  console.log('--- 2.1 REGISTRO ANÔNIMO FORÇANDO ADMIN ---');
  const res21 = await request(server).post('/auth/register').send({
    nome: 'Anonymous', email: `anon${Date.now()}@test.com`, senhaBruta: '12345678', perfil: 'ADMIN'
  });
  console.log(`Status Obtido: ${res21.status} (Esperado: 401 ou Rejeição)`);

  // 2.2 Alterar próprio perfil
  console.log('\n--- 2.2 ALTERAR PRÓPRIO PERFIL ---');
  const res22 = await request(server).patch('/users/me/perfil').set('Authorization', `Bearer ${adminToken}`).send({ perfil: 'ADMIN' });
  console.log(`Status Obtido: ${res22.status} (Esperado: 404 - Endpoint não existe)`);

  // 2.3 Desativar usuário e testar JWT antigo
  console.log('\n--- 2.3 TESTE DE SESSÃO APÓS DESATIVAÇÃO ---');
  // Cria usuario teste
  const userTempEmail = `temp${Date.now()}@fortal.com`;
  await request(server).post('/auth/register').set('Authorization', `Bearer ${adminToken}`).send({
    nome: 'Temp User', email: userTempEmail, senhaBruta: '12345678', perfil: 'OPERADOR'
  });
  // Loga para pegar JWT antigo
  const tempLogin = await request(server).post('/auth/login').send({ email: userTempEmail, senhaBruta: '12345678' });
  const oldJwt = tempLogin.body.accessToken;
  const tempUserId = tempLogin.body.user.id;
  
  // Desativa direto no banco (simulando a ação do caso de uso de desativação)
  await prisma.usuario.update({ where: { id: tempUserId }, data: { ativo: false, tokenVersion: { increment: 1 } } });
  
  // Tenta usar o token antigo
  const res23 = await request(server).get('/orders').set('Authorization', `Bearer ${oldJwt}`);
  console.log(`Status Obtido com token antigo: ${res23.status} (Esperado: 401)`);
  if (res23.status === 401) console.log(`Mensagem: ${res23.body?.message}`);

  // 2.4 Timing attack
  console.log('\n--- 2.4 TIMING ATTACK (Enumeração) ---');
  const startInvalid = performance.now();
  await request(server).post('/auth/login').send({ email: 'naoexiste@fortal.com', senhaBruta: 'senha' });
  const timeInvalid = performance.now() - startInvalid;

  const startValid = performance.now();
  await request(server).post('/auth/login').send({ email: 'admin@fortal.com.br', senhaBruta: 'errada123' });
  const timeValid = performance.now() - startValid;
  console.log(`Tempo email inexistente: ${timeInvalid.toFixed(2)} ms`);
  console.log(`Tempo email existente (senha errada): ${timeValid.toFixed(2)} ms`);

  // 2.5 Senha curta
  console.log('\n--- 2.5 REGISTRO COM SENHA CURTA (123) ---');
  const res25 = await request(server).post('/auth/register').set('Authorization', `Bearer ${adminToken}`).send({
    nome: 'Short', email: `short${Date.now()}@test.com`, senhaBruta: '123', perfil: 'OPERADOR'
  });
  console.log(`Status Obtido: ${res25.status}`);
  console.log(`Body: ${JSON.stringify(res25.body)}`);

  // 2.6 Registro duplicado
  console.log('\n--- 2.6 REGISTRO DE E-MAIL DUPLICADO ---');
  const res26 = await request(server).post('/auth/register').set('Authorization', `Bearer ${adminToken}`).send({
    nome: 'Dup', email: 'admin@fortal.com.br', senhaBruta: '12345678', perfil: 'OPERADOR'
  });
  console.log(`Status Obtido: ${res26.status}`);
  console.log(`Mensagem: ${res26.body?.message}`);

  await app.close();
  process.exit(0);
}
bootstrap();
