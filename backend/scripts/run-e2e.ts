import { execSync } from 'child_process';
import * as path from 'path';

const composeFile = path.resolve(__dirname, '../../docker-compose.e2e.yml');
const backendDir = path.resolve(__dirname, '..');

// Função auxiliar para executar comandos
function runCommand(command: string, cwd: string = backendDir) {
  console.log(`\n> Executando: ${command}`);
  execSync(command, { stdio: 'inherit', cwd });
}

// Fase 1: Verifica se o processo Postgres dentro do container está pronto
function waitForPgIsReady() {
  console.log('\n> Fase 1: Aguardando pg_isready dentro do container...');
  let isReady = false;
  let attempts = 0;
  const maxAttempts = 20;
  const waitMs = 2000;

  while (!isReady && attempts < maxAttempts) {
    try {
      execSync('docker exec fortal_sge_db_e2e pg_isready -U admin -d fortal_sge_e2e', { stdio: 'ignore' });
      isReady = true;
      console.log('  ✓ pg_isready OK');
    } catch (e) {
      attempts++;
      console.log(`  Tentativa ${attempts}/${maxAttempts}: pg_isready não respondeu. Aguardando ${waitMs}ms...`);
      execSync(`node -e "setTimeout(()=>{}, ${waitMs})"`);
    }
  }

  if (!isReady) {
    throw new Error('Falha: pg_isready não respondeu dentro do prazo.');
  }
}

// Fase 2: Verifica conexão real via Prisma (host → porta mapeada)
// pg_isready confirma que o Postgres está de pé DENTRO do container,
// mas no Windows o bind da porta no host pode levar segundos adicionais.
async function waitForPrismaConnection(dbUrl: string) {
  console.log('\n> Fase 2: Testando conexão real do Prisma (host binding)...');
  const { PrismaClient } = await import('@prisma/client');
  const maxAttempts = 10;
  const baseWaitMs = 1000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
    try {
      await prisma.$queryRaw`SELECT 1`;
      await prisma.$disconnect();
      console.log(`  ✓ Conexão Prisma estabelecida na tentativa ${attempt}`);
      return;
    } catch (e: any) {
      await prisma.$disconnect().catch(() => {});
      const waitMs = baseWaitMs * attempt; // backoff linear: 1s, 2s, 3s...
      console.log(`  Tentativa ${attempt}/${maxAttempts}: Prisma ainda não conectou (${e.code ?? e.message?.slice(0, 60)}). Aguardando ${waitMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
  }

  throw new Error('Falha: Prisma não conseguiu conectar ao banco dentro do prazo.');
}

async function runE2E() {
  const keepAlive = process.env.E2E_KEEP_ALIVE === 'true';

  try {
    // Passo 0: Limpar resíduos de execução anterior
    console.log('\n--- PASSO 0: LIMPANDO AMBIENTE ---');
    runCommand(`docker-compose -f "${composeFile}" down -v`, path.resolve(__dirname, '../../'));

    // Passo 1: Subir container efêmero
    console.log('\n--- PASSO 1: SUBINDO CONTAINER EFÊMERO ---');
    runCommand(`docker-compose -f "${composeFile}" up -d`, path.resolve(__dirname, '../../'));

    // Passo 2: Aguardar prontidão (2 fases)
    console.log('\n--- PASSO 2: VERIFICANDO PRONTIDÃO ---');

    // Fase 1: processo Postgres pronto dentro do container
    waitForPgIsReady();

    // Fase 2: port-binding do host realmente disponível (resolve P1001 no Windows)
    const dbUrl = 'postgresql://admin:fortalpassword@localhost:5434/fortal_sge_e2e?schema=public';
    process.env.DATABASE_URL = dbUrl;
    console.log(`\n> Injetando DATABASE_URL=${dbUrl}`);
    await waitForPrismaConnection(dbUrl);

    // Passo 4: Executar migrations
    console.log('\n--- PASSO 4: EXECUTANDO MIGRATIONS ---');
    runCommand('npx prisma migrate deploy');

    // Passo 5: Executar o seed
    console.log('\n--- PASSO 5: EXECUTANDO SEED ---');
    runCommand('npx prisma db seed');

    // Passo 6: Disparar Jest E2E
    console.log('\n--- PASSO 6: EXECUTANDO TESTES E2E ---');
    const jestArgs = process.argv.slice(2).join(' ');
    runCommand(`npx jest --config ./test/jest-e2e.json --runInBand ${jestArgs}`);

  } catch (error) {
    console.error('\n❌ ERRO NA EXECUÇÃO DO E2E:', error);
    process.exit(1);
  } finally {
    console.log('\n--- TEARDOWN ---');
    if (keepAlive) {
      console.log('⚠️ A flag E2E_KEEP_ALIVE está ativada. Pulando destruição do container.');
      console.log('⚠️ Lembre-se de destruir manualmente depois: docker-compose -f docker-compose.e2e.yml down -v');
    } else {
      console.log('Destruindo banco de dados efêmero...');
      try {
        runCommand(`docker-compose -f "${composeFile}" down -v`, path.resolve(__dirname, '../../'));
        console.log('✅ Container destruído com sucesso.');
      } catch (e) {
        console.error('⚠️ Erro ao tentar destruir container no finally:', e);
      }
    }
  }
}

runE2E();
