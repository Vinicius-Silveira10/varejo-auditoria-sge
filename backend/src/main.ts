import 'dotenv/config';
import { validateEnv } from './config/env.validation';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './infrastructure/http/filters/http-exception.filter';

async function bootstrap() {
  // Valida todas as variáveis obrigatórias ANTES de qualquer inicialização.
  // Se DATABASE_URL ou JWT_SECRET estiverem ausentes, o processo encerra com erro explícito.
  const env = validateEnv();
  process.env.DATABASE_URL = env.DATABASE_URL;

  const app = await NestFactory.create(AppModule);

  // CORS: origens explícitas lidas de ALLOWED_ORIGINS (separadas por vírgula).
  // NUNCA usar wildcard com credentials: true — browsers rejeitam por spec.
  app.enableCors({
    origin: env.ALLOWED_ORIGINS,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('SGE - Sistema de Gestão de Estoque')
    .setDescription('Documentação técnica da API de Logística NEXUS Software.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(env.PORT);
}
bootstrap();
