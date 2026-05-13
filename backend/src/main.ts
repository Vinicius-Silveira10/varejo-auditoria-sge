import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './infrastructure/http/filters/http-exception.filter';

async function bootstrap() {
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://admin:fortalpassword@127.0.0.1:5433/fortal_sge?schema=public';
  const app = await NestFactory.create(AppModule);
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

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
