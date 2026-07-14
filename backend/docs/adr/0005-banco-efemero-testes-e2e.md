# ADR 0005: Banco Efêmero para Testes E2E

## Contexto
O projeto vinha utilizando o mesmo banco de desenvolvimento (`fortal_sge_db`) para a execução dos testes E2E. Isso gerava conflito de estado, problemas de concorrência e falsos positivos/negativos, uma vez que dados reais (ou de testes manuais de desenvolvimento) conviviam com as asserções de testes automatizados.
Além disso, com a implementação de mecanismos como o `ChainPointer` (que atua como um singleton global em nível de banco de dados para concorrência de geração de hash em auditorias e movimentações), a convivência de dados de teste e dados reais se tornou totalmente insustentável. O ambiente ficava sujo, exigindo rotinas manuais de limpeza.

## Decisão
Decidimos implementar um isolamento total do banco de dados utilizado pela suíte de testes E2E através da criação de um **banco efêmero e descartável**.
Para isso, foi adotado o seguinte fluxo:
1. Um arquivo `docker-compose.e2e.yml` dedicado, sem mapeamento de volumes persistentes (para garantir o descarte total) e exposto em uma porta distinta (`5434`) para evitar conflito de porta com o banco de desenvolvimento local (`5433`).
2. Um script orquestrador em TypeScript (`scripts/run-e2e.ts`) que gerencia o ciclo de vida completo:
   - Limpa resíduos (derruba containers caso existam de execuções anteriores).
   - Sobe o banco de dados via Docker Compose.
   - Realiza polling verificando a prontidão real do banco usando `pg_isready`.
   - Roda migrations e seeds.
   - Dispara o `jest` em modo seqüencial (`--runInBand`).
   - Destrói o banco ao fim da execução no bloco `finally`.

## Justificativa
Um banco totalmente efêmero garante **idempotência**. A cada execução de `npm run test:e2e`, o sistema recebe um banco de dados totalmente zerado e recém migrado/populado pela seed. Isso elimina flakiness (testes intermitentes) causados por lixo de estado anterior, e permite testes limpos na arquitetura global (ex. `ChainPointer`).

## Consequências
- **Positivas:** 
  - Testes 100% isolados, determinísticos e confiáveis.
  - Idempotência real: múltiplas execuções consecutivas da suíte rodarão com sucesso sem conflitos.
  - Segurança contra corrupção acidental de dados de desenvolvimento.
- **Negativas/Mitigações:**
  - *Overhead de tempo de execução*: subir o container e rodar migrations a cada teste pode atrasar o fluxo de feedback no desenvolvimento local.
  - *Mitigação*: Foi introduzida a variável de ambiente `E2E_KEEP_ALIVE=true`. Quando ativada, o script orquestrador **pula a etapa de destruição** do banco ao final dos testes, permitindo iterações e debbuging rápidos no mesmo banco para o desenvolvedor local (lembrando que ele precisará derrubá-lo manualmente ou deixar o orquestrador fazer a limpeza prévia (`down -v`) na próxima execução completa).
