import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script para geração automatizada do swagger-spec.json.
 * Uso: npm run swagger:export
 */
async function generateSwagger() {
  const app = await NestFactory.create(AppModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle('SGE Fortal — API')
    .setDescription(
      'Sistema de Gestão de Estoque — Documentação completa dos endpoints REST',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Auth', 'Autenticação e geração de tokens JWT')
    .addTag('Usuários', 'Gestão de usuários do sistema')
    .addTag('Produtos', 'Gestão de produtos e classificação ABC')
    .addTag('Endereços', 'Gestão de endereços de armazenagem')
    .addTag('Lotes', 'Recebimento e gestão de lotes de estoque')
    .addTag('Movimentações', 'Registro de movimentações de estoque')
    .addTag('Ajustes de Estoque', 'Solicitação e aprovação de ajustes')
    .addTag('Ordens', 'Gestão de ordens de separação (picking)')
    .addTag('NF-e', 'Processamento e conciliação de Notas Fiscais Eletrônicas')
    .addTag('Inventário', 'Contagens e apuração de inventário cíclico')
    .addTag('Custos', 'Histórico e gestão de custo médio por produto')
    .addTag('Dashboards', 'KPIs estratégicos e operacionais em tempo real')
    .addTag('Auditoria', 'Verificação de integridade e exportação LGPD')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  const outputPath = path.resolve(process.cwd(), 'swagger-spec.json');
  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2), 'utf-8');

  console.log(`✅ swagger-spec.json gerado com sucesso em: ${outputPath}`);
  await app.close();
}

generateSwagger();
