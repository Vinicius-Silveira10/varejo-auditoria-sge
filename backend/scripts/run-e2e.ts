import { execSync } from 'child_process';
import * as path from 'path';

const composeFile = path.resolve(__dirname, '../../docker-compose.e2e.yml');
const backendDir = path.resolve(__dirname, '..');

// Função auxiliar para executar comandos
function runCommand(command: string, cwd: string = backendDir) {
  console.log(`\n> Executando: ${command}`);
  execSync(command, { stdio: 'inherit', cwd });
}

// Verifica se o Postgres está realmente pronto
function waitForPostgres() {
  console.log('\n> Aguardando banco de dados ficar pronto...');
  let isReady = false;
  let attempts = 0;
  const maxAttempts = 15; // 15 tentativas
  const waitMs = 2000; // 2 segundos entre tentativas

  while (!isReady && attempts < maxAttempts) {
    try {
      // Usa pg_isready no container para verificar
      execSync('docker exec fortal_sge_db_e2e pg_isready -U admin -d fortal_sge_e2e', { stdio: 'ignore' });
      isReady = true;
      console.log('Banco de dados pronto para conexões!');
    } catch (e) {
      attempts++;
      console.log(`Tentativa ${attempts}/${maxAttempts}: Banco ainda não está pronto. Aguardando ${waitMs}ms...`);
      execSync(`node -e "setTimeout(()=>{}, ${waitMs})"`); // sleep
    }
  }

  if (!isReady) {
    throw new Error('Falha ao aguardar prontidão do banco de dados.');
  }
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

    // Passo 2: Aguardar prontidão
    console.log('\n--- PASSO 2: VERIFICANDO PRONTIDÃO ---');
    waitForPostgres();

    // Passo 3: Injetar DATABASE_URL
    const dbUrl = 'postgresql://admin:fortalpassword@localhost:5434/fortal_sge_e2e?schema=public';
    process.env.DATABASE_URL = dbUrl;
    console.log(`\n> Injetando DATABASE_URL=${dbUrl}`);

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
