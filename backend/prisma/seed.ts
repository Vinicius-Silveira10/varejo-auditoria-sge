import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando o Seed do Banco de Dados para Staging...');

  // ==========================================
  // 1. USUÁRIOS (RBAC)
  // ==========================================
  const salt = await bcrypt.genSalt(10);
  const senhaPadrao = await bcrypt.hash('SenhaSegura123!', salt);

  const usuarios = [
    { nome: 'Administrador SGE', email: 'admin@fortal.com.br', perfil: 'ADMIN' as const },
    { nome: 'Gestor Operacional', email: 'gestor@fortal.com.br', perfil: 'GESTOR' as const },
    { nome: 'Operador Logístico', email: 'operador@fortal.com.br', perfil: 'OPERADOR' as const },
  ];

  for (const u of usuarios) {
    await prisma.usuario.upsert({
      where: { email: u.email },
      update: {},
      create: {
        nome: u.nome,
        email: u.email,
        senha: senhaPadrao,
        perfil: u.perfil,
        ativo: true,
      },
    });
  }
  console.log(`✅ ${usuarios.length} Usuários inseridos (ADMIN, GESTOR, OPERADOR).`);

  // ==========================================
  // 2. ENDEREÇOS E ZONAS
  // ==========================================
  const enderecos = [
    { codigo: 'A-01-01', zona: 'A', tipoZona: 'SECO', capacidade: 1000 },
    { codigo: 'A-01-02', zona: 'A', tipoZona: 'SECO', capacidade: 1000 },
    { codigo: 'B-01-01', zona: 'B', tipoZona: 'REFRIGERADO', capacidade: 500 },
    { codigo: 'B-01-02', zona: 'B', tipoZona: 'REFRIGERADO', capacidade: 500 },
    { codigo: 'C-01-01', zona: 'C', tipoZona: 'CONGELADO', capacidade: 300 },
  ];

  for (const end of enderecos) {
    await prisma.endereco.upsert({
      where: { codigo: end.codigo },
      update: {},
      create: {
        codigo: end.codigo,
        zona: end.zona,
        tipoZona: end.tipoZona,
        capacidade: end.capacidade,
        ocupado: 0,
        ativo: true,
      },
    });
  }
  console.log(`✅ ${enderecos.length} Endereços inseridos (Zonas SECO, REFRIGERADO, CONGELADO).`);

  // ==========================================
  // 3. PRODUTOS (Catálogo)
  // ==========================================
  const produtos = [
    { sku: 'SKU-SECO-001', descricao: 'Arroz Branco 5kg', categoria: 'Alimentos', perecivel: false, tipoZonaRequerida: 'SECO', curvaAbc: 'A', custoMedio: 20.50 },
    { sku: 'SKU-REFR-001', descricao: 'Iogurte Natural', categoria: 'Laticínios', perecivel: true, tipoZonaRequerida: 'REFRIGERADO', curvaAbc: 'B', custoMedio: 5.00 },
    { sku: 'SKU-CONG-001', descricao: 'Picanha Bovina', categoria: 'Carnes', perecivel: true, tipoZonaRequerida: 'CONGELADO', curvaAbc: 'A', custoMedio: 80.00 },
  ];

  for (const prod of produtos) {
    await prisma.produto.upsert({
      where: { sku: prod.sku },
      update: {},
      create: {
        sku: prod.sku,
        descricao: prod.descricao,
        categoria: prod.categoria,
        perecivel: prod.perecivel,
        tipoZonaRequerida: prod.tipoZonaRequerida,
        curvaAbc: prod.curvaAbc,
        custoMedio: prod.custoMedio,
        ativo: true,
      },
    });
  }
  console.log(`✅ ${produtos.length} Produtos inseridos (Curvas A/B/C).`);

  console.log('🎯 Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
