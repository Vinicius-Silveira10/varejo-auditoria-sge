# Checkpoint Final - Backend (SGE Fortal)

Este documento sumariza as correções de arquitetura e infraestrutura aplicadas no backend (Features 1 a 3), garantindo a consistência das operações de banco de dados e habilitando a integração da interface gráfica para as tarefas da Sprint 2.

## 1. Tratamento de Bloqueantes

- **Identidade e Hash Encadeado:** Corrigida a falta de atomicidade na geração da trilha de auditoria. Refatorado para uso da interface de infraestrutura transacional `IUnitOfWork`, unificando as operações de movimentação, lote e custo em uma mesma transação.
- **CMP (Custo Médio Ponderado) - Assincronismo:** A atualização assíncrona baseada em eventos permitia que operações paralelas causassem *race conditions*, quebrando a cronologia do custo médio. A arquitetura foi alterada para atualização transacional com lock.
- **CMP - Regra de Negócio (ADR-004):** Ajustes manuais de estoque, independentemente do tipo (positivo ou negativo), não afetam o custo médio ponderado, isolando a regra apenas para entradas via NFe. Comportamento validado na suíte de testes unitários.
- **Resiliência do Redis (Fallback):** Implementado mecanismo de fallback no serviço de relatórios (KPIs). Em cenários de timeout ou falha de conexão do Redis, o sistema realiza a leitura degradada diretamente na base relacional do PostgreSQL, mitigando falhas na apresentação dos dashboards.

## 2. Auditoria e Concorrência de Infraestrutura (Sprint 2)

Durante os testes de integração e concorrência (E2E), duas anomalias transacionais graves foram mapeadas e corrigidas:

1. **Forks no ChainPointer:** Transações simultâneas de diferentes domínios, operando sob o nível de isolamento padrão `READ COMMITTED`, liam o mesmo hash encadeado anterior. Mitigado através de Pessimistic Locking com uso explícito da cláusula `SELECT ... FOR UPDATE`.
2. **Deadlock Reversos (ADR-005):** O registro de movimentações causava erro Postgres `40P01` (deadlock detected) em fluxos paralelos que disputavam os mesmos lotes e a tabela singleton `ChainPointer` em ordem reversa (ex: `Lote -> ChainPointer` vs `ChainPointer -> Lote`).
   - **Correção Adotada:** Imposta convenção de aquisição de locks. Todo Use Case deve invocar os locks de domínio no topo da transação, operando de forma descendente (Ex: `Produto -> Lote -> Endereco -> ChainPointer`).
   - Múltiplas entidades do mesmo domínio em uma única transação são ordenadas numericamente para evitar deadlocks intrafuncionais (ex: `[...new Set(ids)].sort()`).

## 3. Ambiente de Testes E2E

O pipeline de testes locais e de CI foi atualizado para isolamento total das suítes de teste de integração.
- A execução `npm run test:e2e` invoca um script gerenciador (`scripts/run-e2e.ts`).
- Instancia e derruba um container Docker (`fortal_sge_db_e2e`) efêmero dedicado.
- O provisionamento ocorre independentemente dos volumes locais, garantindo que o banco de dados receba os schemas (`prisma migrate deploy`) e os seeders sem contaminação por artefatos de testes anteriores.

## 4. Backlog de Dívida Técnica (Baixa Prioridade)

Itens mapeados que não bloqueiam as Sprints de produto em andamento:
- Ajustes de tipagem do Typescript (aprox. 11 falhas em stubs/mocks legados no diretório test).
- Parâmetros de metas hardcoded nas controllers de Dashboard (necessita expor os valores para `.env` ou base de configurações persistentes).
- Uso da data do SO para emissão de logs (`new Date()`). Já registrado na documentação de arquitetura a necessidade futura de transição para um serviço central (NTP) focado em SRE.

## 5. Próximos Passos (Integração Frontend)

- Retomada do consumo das APIs da Sprint 2 (Putaway).
- O backend disponibiliza as rotas `GET /batches/pending-putaway`, `GET /addresses/suggest-putaway` e `POST /addresses/putaway`.
- Os casos de uso expostos estão estruturalmente protegidos contra *race conditions* de concorrência.
