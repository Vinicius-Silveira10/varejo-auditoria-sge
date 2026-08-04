/**
 * INVESTIGAÇÃO BUG-007: Isolamento de variável para chain-pointer.concurrency.e2e-spec.ts
 * 
 * Experimento A: Roda o teste 10x consecutivas com banco resetado antes de cada execução.
 *   - Se falhar com banco limpo → a correção FOR UPDATE nunca funcionou.
 *   - Se passar 10/10 com banco limpo → a correção funciona em isolamento.
 * 
 * Experimento B: Roda o teste 3x SEM reset entre elas (estado acumulado).
 *   - Se falhar sem reset mas passou com reset → sujeira de estado entre suítes.
 */

import { execSync } from 'child_process';
import * as path from 'path';

const backendDir = path.resolve(__dirname, '..');
const composeFile = path.resolve(__dirname, '../../docker-compose.e2e.yml');
const dbUrl = 'postgresql://admin:fortalpassword@localhost:5434/fortal_sge_e2e?schema=public';

function run(cmd: string, cwd: string = backendDir, ignoreError = false) {
  try {
    execSync(cmd, { stdio: 'inherit', cwd, env: { ...process.env, DATABASE_URL: dbUrl } });
  } catch (e) {
    if (!ignoreError) throw e;
  }
}

function resetDatabase() {
  console.log('\n🔄 RESET: Truncando todas as tabelas e re-executando seed...');
  // Usa prisma migrate reset --force para dropar e recriar tudo
  run('npx prisma migrate reset --force --skip-generate');
}

function runChainPointerTest(): boolean {
  try {
    run(`npx jest --config ./test/jest-e2e.json --forceExit --runInBand test/chain-pointer.concurrency.e2e-spec.ts`);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  INVESTIGAÇÃO BUG-007: Isolamento de Variável');
  console.log('  chain-pointer.concurrency.e2e-spec.ts');
  console.log('═══════════════════════════════════════════════════════════════');

  // ─── Garantir que o container E2E está de pé ─────────────────────────
  console.log('\n--- PASSO 0: GARANTINDO CONTAINER EFÊMERO ---');
  run(`docker-compose -f "${composeFile}" up -d`, path.resolve(__dirname, '../../'), true);
  
  // Esperar pg_isready
  let ready = false;
  for (let i = 1; i <= 15; i++) {
    try {
      execSync('docker exec fortal_sge_db_e2e pg_isready -U admin -d fortal_sge_e2e', { stdio: 'ignore' });
      ready = true;
      break;
    } catch {
      console.log(`  pg_isready tentativa ${i}/15...`);
      execSync(`node -e "setTimeout(()=>{}, 2000)"`);
    }
  }
  if (!ready) { console.error('FATAL: banco não subiu'); process.exit(1); }
  console.log('  ✓ Container pronto');

  // ═══════════════════════════════════════════════════════════════════════
  // EXPERIMENTO A: 10x com banco resetado antes de cada execução
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  EXPERIMENTO A: 10x com banco limpo (reset antes)       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  const resultsA: boolean[] = [];
  for (let i = 1; i <= 10; i++) {
    console.log(`\n━━━ Iteração A-${i}/10 ━━━`);
    resetDatabase();
    const passed = runChainPointerTest();
    resultsA.push(passed);
    console.log(`  → Iteração A-${i}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
  }

  const passedA = resultsA.filter(Boolean).length;
  const failedA = resultsA.filter(r => !r).length;

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log(`║  RESULTADO EXPERIMENTO A: ${passedA}/10 PASS, ${failedA}/10 FAIL`);
  if (failedA > 0) {
    console.log('║  DIAGNÓSTICO: A correção FOR UPDATE FALHA mesmo com');
    console.log('║  banco limpo. O fix NUNCA FUNCIONOU de verdade.');
  } else {
    console.log('║  DIAGNÓSTICO: A correção FOR UPDATE funciona em');
    console.log('║  isolamento. Prosseguir para Experimento B.');
  }
  console.log('╚═══════════════════════════════════════════════════════════╝');

  // ═══════════════════════════════════════════════════════════════════════
  // EXPERIMENTO B: 3x SEM reset (estado acumulado)
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  EXPERIMENTO B: 3x sem reset (estado acumulado)         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  // Reset uma única vez antes de iniciar
  resetDatabase();

  const resultsB: boolean[] = [];
  for (let i = 1; i <= 3; i++) {
    console.log(`\n━━━ Iteração B-${i}/3 (SEM RESET) ━━━`);
    const passed = runChainPointerTest();
    resultsB.push(passed);
    console.log(`  → Iteração B-${i}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
  }

  const passedB = resultsB.filter(Boolean).length;
  const failedB = resultsB.filter(r => !r).length;

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log(`║  RESULTADO EXPERIMENTO B: ${passedB}/3 PASS, ${failedB}/3 FAIL`);
  if (passedA === 10 && failedB > 0) {
    console.log('║  DIAGNÓSTICO: Sujeira de estado entre execuções.');
    console.log('║  O teste não é self-cleaning. O fix funciona mas');
    console.log('║  dados residuais corrompem a cadeia de hash.');
  } else if (failedB === 0) {
    console.log('║  DIAGNÓSTICO: Passa isolado E acumulado.');
    console.log('║  A falha original é contaminação de OUTRAS suítes.');
  }
  console.log('╚═══════════════════════════════════════════════════════════╝');

  // ═══════════════════════════════════════════════════════════════════════
  // SUMÁRIO FINAL
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  SUMÁRIO FINAL');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  Exp A (isolado):   ${passedA}/10 → ${failedA === 0 ? 'FIX VÁLIDO EM ISOLAMENTO' : 'FIX QUEBRADO'}`);
  console.log(`  Exp B (acumulado): ${passedB}/3  → ${failedB === 0 ? 'SELF-CLEANING OK' : 'CONTAMINAÇÃO DE ESTADO'}`);
  
  if (failedA === 0 && failedB === 0) {
    console.log('  VEREDICTO: Problema é contaminação de OUTRAS suítes E2E');
  } else if (failedA === 0 && failedB > 0) {
    console.log('  VEREDICTO: Teste não é self-cleaning (lixo próprio)');
  } else {
    console.log('  VEREDICTO: A correção FOR UPDATE não resolve a race condition');
  }
  console.log('══════════════════════════════════════════════════════════');
}

main().catch(e => { console.error(e); process.exit(1); });
