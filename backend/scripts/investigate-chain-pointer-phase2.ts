/**
 * INVESTIGAÇÃO BUG-007 — FASE 2: Identificar a suíte contaminante
 * 
 * Estratégia: Rodar cada outra suíte E2E SEGUIDA do chain-pointer test,
 * com banco limpo antes de cada par. A primeira que quebrar o chain-pointer
 * é a culpada.
 */

import { execSync } from 'child_process';
import * as path from 'path';

const backendDir = path.resolve(__dirname, '..');
const dbUrl = 'postgresql://admin:fortalpassword@localhost:5434/fortal_sge_e2e?schema=public';

function run(cmd: string, cwd: string = backendDir, ignoreError = false): boolean {
  try {
    execSync(cmd, { stdio: 'inherit', cwd, env: { ...process.env, DATABASE_URL: dbUrl } });
    return true;
  } catch {
    if (ignoreError) return false;
    return false;
  }
}

function resetDatabase() {
  console.log('  🔄 Reset banco...');
  run('npx prisma migrate reset --force --skip-generate');
}

// Suítes que criam movimentações ou manipulam dados que podem contaminar o ChainPointer
const suspects = [
  'test/api-flow.e2e-spec.ts',
  'test/flow-e2e.e2e-spec.ts',
  'test/audit-traceability.e2e-spec.ts',
  'test/picking-deadlock.e2e-spec.ts',
  'test/concurrency-orders.e2e-spec.ts',
  'test/adjustment-concurrency.e2e-spec.ts',
  'test/adjustment-drift.e2e-spec.ts',
  'test/adjustment-pending.e2e-spec.ts',
  'test/inventory-backend.e2e-spec.ts',
  'test/backfill-saldoteorico.e2e-spec.ts',
  'test/smoke-test.e2e-spec.ts',
  'test/auth.e2e-spec.ts',
  'test/app.e2e-spec.ts',
  'test/use-cases/receive-batch.concurrency.e2e-spec.ts',
];

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  FASE 2: Identificar suíte contaminante');
  console.log('═══════════════════════════════════════════════════════════');

  const results: { suite: string; chainPassed: boolean }[] = [];

  for (const suite of suspects) {
    console.log(`\n━━━ Testando contaminação por: ${suite} ━━━`);
    
    // 1. Reset limpo
    resetDatabase();
    
    // 2. Rodar a suíte suspeita (ignorar se falhar — queremos o estado residual)
    console.log(`  ▶ Rodando ${suite}...`);
    run(`npx jest --config ./test/jest-e2e.json --forceExit --runInBand ${suite}`, backendDir, true);
    
    // 3. Rodar o chain-pointer SEM reset
    console.log(`  ▶ Rodando chain-pointer após ${suite}...`);
    const chainPassed = run(
      `npx jest --config ./test/jest-e2e.json --forceExit --runInBand test/chain-pointer.concurrency.e2e-spec.ts`,
      backendDir,
      true
    );
    
    results.push({ suite, chainPassed });
    console.log(`  → ${suite}: chain-pointer ${chainPassed ? '✅ PASS' : '❌ FAIL (CONTAMINANTE!)'}`);
    
    // Se encontrou a contaminante, ainda continua para ver se há mais
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  RESULTADO FASE 2');
  console.log('═══════════════════════════════════════════════════════════');
  
  for (const r of results) {
    console.log(`  ${r.chainPassed ? '✅' : '❌'} ${r.suite}`);
  }
  
  const contaminants = results.filter(r => !r.chainPassed);
  if (contaminants.length === 0) {
    console.log('\n  DIAGNÓSTICO: Nenhuma suíte individual contamina sozinha.');
    console.log('  A corrupção pode ser por COMBINAÇÃO de suítes ou por');
    console.log('  ordem de execução alfabética do Jest.');
  } else {
    console.log(`\n  CONTAMINANTES IDENTIFICADAS: ${contaminants.length}`);
    for (const c of contaminants) {
      console.log(`    ❌ ${c.suite}`);
    }
  }
  console.log('═══════════════════════════════════════════════════════════');
}

main().catch(e => { console.error(e); process.exit(1); });
