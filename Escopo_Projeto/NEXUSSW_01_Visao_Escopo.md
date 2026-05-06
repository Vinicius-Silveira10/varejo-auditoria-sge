# Supermercado Fortal LTDA

## SGE – Sistema de Gestão de Estoque.

### Documento: Visão e Escopo (Constituição do Projeto) – Versão 1.0


**Elaborado por:** Vinicius Silveira
**Padrão:** ABNT Técnico.
**Status:** Aprovado.

-----

## Sumário

1.  Introdução e Contexto do Problema
2.  Propósito e Visão do Sistema
3.  Objetivos e Indicadores de Desempenho (KPIs)
4.  Escopo Funcional (Macroprocessos e Requisitos)
5.  Escopo Não Funcional (NFRs Técnicos e de Negócio)
6.  Governança, Premissas e Restrições
7.  Atores-Chave e Stakeholders (RASCI)
8.  Fronteiras, Arquitetura e Dados
9.  Riscos de Negócio e Projeto
10. Especificações Técnicas (Stack Detalhada)
11. Entregáveis e Marcos do Projeto
12. Controle de Versão e Aprovação

-----

## 1\. Introdução e Contexto do Problema

### 1.1 Propósito do Documento

O presente documento tem por objetivo estabelecer a **visão e o escopo** do **SGE – Sistema de Gestão de Estoque** do **Supermercado Fortal**.

Este documento configura-se como a **Constituição do Projeto**. Sua função é servir como **fonte única e estruturada da verdade (semente)** para o pipeline de geração de artefatos do sistema, baseando-se em princípios de rastreabilidade total entre requisitos, regras, processos, dados e KPIs.

### 1.2 Contexto Organizacional

O **Supermercado Fortal** é uma rede varejista regional composta por lojas e um Centro de Distribuição (CD) centralizado. O controle de estoque é atualmente descentralizado, sem integração sistêmica, o que resulta em discrepâncias significativas entre os estoques físico e sistêmico.

### 1.3 Problema Central

A ausência de controle unificado de estoque e rastreabilidade de movimentações gera **rupturas de produtos, perdas financeiras e capital imobilizado**.

| Indicador | Valor Atual | Meta Desejada |
|------------|--------------|----------------|
| Acurácia de Estoque | 85% | ≥ 98% |
| Rupturas em Itens Classe A | 12% | ≤ 5% (≤ 3% Meta) |
| Capital Parado em Estoque Obsoleto | R$ 2.000.000 | ≤ 5% (Meta KPI) |
| Tempo Médio de Inventário | 3 dias | ≤ 6 horas (≤ 4h Meta) |

### 1.4 Abordagem do Documento

O SGE é o pilar da **transformação digital logística Fortal 2025**, visando integração operacional entre **Centro de Distribuição (CD)** e **Lojas**, além de gerar informações de apoio à tomada de decisão.

-----

## 2\. Propósito e Visão do Sistema

### 2.1 Declaração de Visão

> “O SGE\_Fortal será um sistema integrado, web-based e orientado a dados, capaz de registrar, controlar e analisar todas as movimentações de estoque da rede Fortal com confiabilidade, rastreabilidade e inteligência analítica.”

### 2.2 Missão

Garantir **acurácia e disponibilidade contínua de informações de estoque**, apoiando decisões operacionais, táticas e estratégicas em tempo real.

### 2.3 Propósito Detalhado

O propósito do SGE é **garantir acurácia, rastreabilidade e eficiência logística**, integrando processos de recebimento, armazenagem, movimentação, inventário e relatórios gerenciais.

O sistema deverá:

  - Reduzir perdas e divergências de estoque.
  - Aumentar a confiabilidade das informações.
  - Automatizar a geração de indicadores de desempenho (KPIs).
  - Apoiar decisões baseadas em dados reais e atualizados.
  - **Garantir escalabilidade e alta performance através de arquitetura assíncrona moderna**.

### 2.4 Benefícios Esperados

  - Eliminação de divergências físico-lógicas.
  - Redução de perdas e rupturas.
  - Transparência contábil e fiscal no custo médio.
  - Melhoria do giro e da rentabilidade do estoque.
  - Dashboards inteligentes e alertas automáticos de anomalias.

-----

## 3\. Objetivos e Indicadores de Desempenho (KPIs)

O sistema deve atender a objetivos em múltiplos níveis, mensuráveis por KPIs claros:

| Categoria | Objetivo | Indicador / KPI | Meta |
|------------|-----------|------------|------|
| **Operacional** | Aumentar a acurácia do estoque | KPI-ACUR-01 (Acurácia) | ≥ 98% |
| **Operacional** | Reduzir o tempo de inventário | KPI-INV-01 (Tempo Inventário) | ≤ 6 horas (Meta ≤ 4h) |
| **Estratégico** | Minimizar rupturas (Classe A) | KPI-RUPT-01 (Ruptura) | ≤ 3% (Ref. 5%) |
| **Financeiro** | Reduzir perdas e ajustes (acima de R$ 1.000) | KPI-AJU-01 (Perdas) | Redução de 90% |
| **Financeiro** | Otimizar giro de estoque | KPI-GIRO-01 (Giro) | ≤ 45 dias |
| **Financeiro** | Controlar obsolescência | KPI-OBSL-01 (Obsolescência) | ≤ 5% |
| **Operacional** | Garantir Nível de Serviço | KPI-SERV-01 (Nível de Serviço) | ≥ 95% |
| **Gestão** | Gerar relatórios e dashboards automáticos | KPI-BI-01 (Integração BI) | 100% integrado ao BI |

-----

## 4\. Escopo Funcional (Macroprocessos e Requisitos)

### 4.1 Macroprocessos do Ciclo de Estoque (SIPOC de Alto Nível)

O SGE cobrirá o ciclo completo de gestão de estoque. Os processos são interdependentes e seguem o fluxo lógico de negócio.

| Código | Processo Principal | Entradas Principais (Inputs) | Saídas Principais (Outputs) | Gatilho / Dependência |
|---|---|---|---|---|
| **P01** | Recebimento de Mercadorias | NF-e, Pedido de Compra | Estoque atualizado, Log de recebimento | Chegada de mercadoria |
| **P02** | Atualização de Custo Médio | Dados de NF-e, Saldo anterior | Novo custo médio (AVG) por SKU | **Gatilho:** Conclusão do P01 |
| **P03** | Armazenagem (Putaway) | Produtos liberados, Mapa de endereçamento | Localização atualizada, Saldo por endereço | **Gatilho:** Conclusão do P01 |
| **P04** | Movimentação e Expedição | Solicitação de transferência, Pedido de saída | Saída registrada, Saldo atualizado | Pedido de Venda/Transferência |
| **P05** | Inventário Cíclico | Agendamento, Lista de contagem | Relatório de inventário, Propostas de ajuste | Agendamento (diário, semanal, mensal) |
| **P06** | Ajustes de Estoque | Divergências identificadas (do P05) | Ajuste registrado, Log de auditoria | **Gatilho:** Divergências do P05 |
| **P07** | Relatórios e Auditoria | Dados de movimentação, Custos, Logs | Relatórios analíticos, Logs imutáveis | Agendamentos e eventos críticos |
| **P08** | Dashboards e Gestão | KPIs consolidados (do P07) | Painéis (Operacional, Tático, Estratégico) | **Gatilho:** Publicação do P07 |

### 4.2 Requisitos Funcionais (RFs) de Alto Nível

O SGE deverá implementar as seguintes funcionalidades centrais (este é o catálogo semente de RFs):

  * **RF-P01-001 (Recebimento):** O sistema deve permitir a conferência de mercadorias via NF-e (XML) contra Pedido de Compra.
  * **RF-P02-001 (Custo Médio):** O sistema deve recalcular automaticamente o Custo Médio Ponderado (AVG) após a confirmação de cada recebimento (P01).
  * **RF-P03-001 (Armazenagem):** O sistema deve controlar o endereçamento físico (Putaway), validando a capacidade do endereço e zonas térmicas.
  * **RF-P04-001 (Movimentação):** O sistema deve registrar todas as movimentações internas (origem/destino) e saídas (expedição).
  * **RF-P04-002 (FEFO):** O sistema deve aplicar a política FEFO (First Expired, First Out) na separação (picking) de perecíveis.
  * **RF-P04-003 (Saldo Negativo):** O sistema deve **impedir** qualquer movimentação que resulte em saldo negativo.
  * **RF-P05-001 (Inventário):** O sistema deve suportar inventários (cíclico e geral), bloqueando movimentações na área de contagem.
  * **RF-P06-001 (Ajustes):** O sistema deve exigir justificativa classificada (ex: 'QUEBRA', 'ERRO') para todos os ajustes de estoque.
  * **RF-P06-002 (Governança de Ajuste):** O sistema deve exigir **dupla aprovação** (Gestor + Controladoria) para ajustes que excedam os limites de `|Δ%| > 2%` **ou** `|Δ valor| > R$ 1.000,00`.
  * **RF-P07-001 (Auditoria):** O sistema deve gerar trilhas de auditoria completas (quem, quando, o quê, antes, depois) para todas as operações críticas.
  * **RF-P08-001 (Dashboards):** O sistema deve prover painéis por nível (Operacional, Tático, Estratégico).

### 4.3 Processos Excluídos

  * Emissão de NF-e de venda ou compra (Escopo do ERP).
  * Controle financeiro-contábil (Escopo do ERP).
  * Gestão de pedidos de clientes (Escopo do OMS).
  * Gestão de recursos humanos e controle de ponto eletrônico.

-----

## 5\. Escopo Não Funcional (NFRs Técnicos e de Negócio)

O sistema deve obedecer aos seguintes NFRs semente:

| Categoria | ID | Requisito | Meta / Critério |
|---|---|---|---|
| **Performance** | RNF-PERF-001 | Tempo de resposta (Operações simples) | ≤ 2s (P95) |
| **Performance** | RNF-PERF-002 | Tempo de resposta (Relatórios) | ≤ 3s (P80) |
| **Performance** | RNF-PERF-003 | Throughput (Transações/min) | ≥ 1.000 |
| **Performance** | RNF-PERF-004 | Concorrência (Usuários simultâneos) | ≥ 50 |
| **Disponibilidade**| RNF-DISP-001 | Uptime (Mensal) | ≥ 99,5% |
| **Continuidade** | RNF-CONT-001 | RTO (Tempo de Recuperação) | ≤ 30 minutos |
| **Continuidade** | RNF-CONT-002 | RPO (Perda Máxima de Dados) | ≤ 15 minutos |
| **BI / Dados** | RNF-BI-001 | Atraso de Dados (Dashboards) | **≤ 5 minutos** (Entre SGE e BI) |
| **Segurança** | RNF-SEG-001 | Autenticação | OAuth 2.0 com JWT |
| **Segurança** | RNF-SEG-002 | Segregação de Funções (SoD) | RBAC obrigatório; quem lança não pode aprovar |
| **Auditoria** | RNF-AUD-001 | Imutabilidade de Log | Logs devem ser **imutáveis** (via hash/encadeamento) |
| **Auditoria** | RNF-AUD-002 | Retenção de Log | **Mínimo de 5 anos** |
| **Auditoria** | RNF-AUD-003 | Rastreabilidade de Log | Logs devem conter (quem, quando, onde, o quê, antes, depois) |
| **Compliance** | RNF-COMP-001 | LGPD | Anonimização/Pseudonimização em exportações e relatórios |
| **Capacidade** | RNF-CAP-001 | Volume de SKUs | ≥ 100.000 SKUs |
| **Capacidade** | RNF-CAP-002 | Volume de Transações | ≥ 30.000 movimentações/dia |

-----

## 6\. Governança, Premissas e Restrições

### 6.1 Modelo de Governança

  * A governança dos processos (P01-P08) seguirá o modelo **RASCI** (Responsible, Accountable, Supported, Consulted, Informed) para definição clara de papéis e responsabilidades.

### 6.2 Premissas

**Organizacionais:**

  * A política de expedição de perecíveis seguirá **obrigatoriamente** o critério **FEFO (First Expired, First Out)**.
  * O método de custeio adotado pela organização é o **Custo Médio Ponderado (AVG)**. A fórmula de cálculo é:
    $$\text{Novo Custo Médio} = \frac{(Custo\_Anterior \times Qtde\_Anterior) + (Custo\_Entrada \times Qtde\_Entrada)}{Quantidade\_Anterior + Quantidade\_Entrada}$$
  * Ajustes de estoque (P06) e inventário (P05) **não alteram** o Custo Médio (AVG); apenas o Recebimento (P01) o faz.
  * Treinamento de usuários ocorrerá em 2 fases (piloto + rollout).
  * Dados mestres (produtos, fornecedores) validados e importados antes do go-live.

**Tecnológicas:**

  * Ambiente **PostgreSQL 15** como banco de dados principal.
  * Stack de back-end baseada em **Node.js 20 LTS + TypeScript 5.3**.
  * Stack de front-end baseada em **React/Next.js** com **TypeScript**.
  * **Redis 7** disponível para cache e filas.
  * **Docker** disponível para containerização.
  * Infraestrutura de rede com HTTPS e TLS 1.3.

### 6.3 Restrições

**Técnicas:**

  * Sem integração fiscal/ERP na versão 1.0 (será API-first).
  * Sistema **não multi-tenant** (instância única Fortal).
  * Controle de validade e lote obrigatório apenas para perecíveis.
  * **Limitação de 50 requisições/minuto por usuário** (rate limiting).

**Organizacionais:**

  * Orçamento limitado a **R$ 500.000** para desenvolvimento.
  * Prazo de entrega: **6 meses** (MVP em 3 meses).
  * Equipe limitada: 1 arquiteto, 3 devs full-stack Node.js, 1 QA.

**Regulatórias:**

  * Conformidade obrigatória com **LGPD**.
  * Auditoria trimestral de segurança.
  * Logs de transações devem ser mantidos por **5 anos** (vide RNF-AUD-002).

-----

## 7\. Atores-Chave e Stakeholders (RASCI)

| Ator / Stakeholder | Função Organizacional | Nível | Responsabilidades Principais |
|---|---|---|---|
| **Direção Executiva** | Patrocinador | Decisor | Aprovar políticas, validar entregas, analisar KPIs estratégicos. |
| **Gestor de Operações** | Gestão de Estoque/CD | Usuário-chave | (A) Accountable pela maioria dos processos; aprovar ajustes (Nível 1). |
| **Operador de Estoque** | Usuário de CD/loja | Usuário Final | (R) Responsible pela execução de recebimento, putaway, picking, contagem. |
| **Controladoria / Financeiro** | Stakeholder Organizacional | Fiscalizador | (R) Responsible pela Atualização de Custo Médio; (C) Consulted em Ajustes. |
| **Compras** | Stakeholder Organizacional | Fiscalizador | (C) Consulted no Recebimento e Expedição. |
| **Auditoria Interna** | Agente de controle | Fiscalizador | (C) Consulted em Ajustes e Inventário; (S) Support em Relatórios. |
| **Administrador TI** | Suporte Técnico | Suporte | (S) Support na manutenção do sistema, permissões (RBAC) e logs. |
| **Desenvolvedor Full-Stack** | Equipe Técnica | Implementação | Desenvolver endpoints REST, WebSocket, componentes React. |
| **DBA (Database Admin)** | Equipe Técnica | Implementação | Otimização de queries, backups, tuning. |

-----

## 8\. Fronteiras, Arquitetura e Dados

### 8.1 Arquitetura de Alto Nível (Componentes)

```text
┌─────────────────────────────────────────────────────────────────┐
│                        USUÁRIOS FINAIS                          │
│  [Operador CD] [Gestor] [Auditor] [Admin TI] [Diretoria]        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    CAMADA DE APRESENTAÇÃO                       │
│                                                                 │
│  ┌─────────────────────┐      ┌─────────────────────┐           │
│  │   Web App (React)   │      │  Mobile App (PWA)   │           │
│  │   Next.js + TS      │      │  React Native Web   │           │
│  └──────────┬──────────┘      └──────────┬──────────┘           │
│             │                            │                      │
│             └─────────────┬──────────────┘                      │
│                           │ HTTPS (REST + WebSocket)            │
└───────────────────────────┼─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    CAMADA DE APLICAÇÃO (API)                    │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  API Gateway (Nginx/Kong/AWS)                          │     │
│  │  • Rate Limiting  • CORS  • Authentication (JWT)       │     │
│  └────────────────────┬───────────────────────────────────┘     │
│                       │                                         │
│  ┌────────────────────▼───────────────────────────────────┐     │
│  │  Node.js Application (TypeScript + Express/NestJS)     │     │
│  │                                                        │     │
│  │  [P01: Recebimento] [P02: Custo] [P03: Armazenagem]    │     │
│  │  [P04: Expedição]   [P05: Inventário] [P06: Ajustes]   │     │
│  │  [P07: Relatórios]  [P08: Dashboards] [Auditoria]      │     │
│  │                                                        │     │
│  │  • REST API Controllers                                │     │
│  │  • Business Logic Services                             │     │
│  │  • ORM (Prisma / TypeORM)                              │     │
│  │  • WebSocket Server (Socket.io / ws)                   │     │
│  │  • Background Jobs (BullMQ / Agenda)                   │     │
│  └────────────────────┬───────────────────────────────────┘     │
│                       │                                         │
│  ┌────────────────────▼───────────────────────────────────┐     │
│  │  PM2 Process Manager (Cluster Mode)                    │     │
│  │  • Load Balancing entre instâncias Node.js             │     │
│  │  • Auto-restart em caso de crash                       │     │
│  └────────────────────────────────────────────────────────┘     │
└────────────────────────┼────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    CAMADA DE DADOS                              │
│                                                                 │
│  ┌─────────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │  PostgreSQL 15  │  │  Redis 7     │  │  AWS S3          │    │
│  │  (Dados)        │  │  (Cache)     │  │  (Arquivos NF-e) │    │
│  │                 │  │  (Sessões)   │  │                  │    │
│  │  • Produtos     │  │  (Queue)     │  │  • Documentos    │    │
│  │  • Movimentos   │  │              │  │  • Relatórios    │    │
│  │  • Inventários  │  │              │  │  • Backups       │    │
│  │  • Logs         │  │              │  │                  │    │
│  └─────────────────┘  └──────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                  INTEGRAÇÕES EXTERNAS                           │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐       │
│  │  Power BI    │  │  ERP Fortal  │  │  Sistemas CD     │       │
│  │  (Dashboards)│  │  (Fiscal)    │  │  (WMS Externo)   │       │
│  └──────────────┘  └──────────────┘  └──────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

*[Arquitetura de Alto Nível original de SGE\_03\_Visao\_Escopo\_v2\_2C.md, Seção 8.1]*

### 8.2 Fronteiras de Integração

  * ✅ **Power BI Fortal** (consumo de dados via API REST).
  * ✅ **Módulos internos Fortal 2025** (CD, Lojas).
  * ✅ **AWS S3** (armazenamento de documentos, XMLs de NF-e).
  * ✅ **Serviço de e-mail** (notificações via Nodemailer).
  * ❌ ERP externo (fiscal/contábil) - *O SGE fornecerá uma API para o ERP consumir*.
  * ❌ Sistemas de CRM.
  * ❌ Gateways de pagamento.

### 8.3 Modelo Conceitual de Dados (Semente)

O sistema será estruturado em torno das seguintes entidades de negócio centrais:

1.  **Produto:** O item (SKU) a ser gerenciado (Ex: `tb_produto`).
2.  **Lote:** Instância de um produto com validade e quantidade (Ex: `tb_lote`). *Esta é a entidade central de saldo.*
3.  **Endereço:** Local físico de armazenagem (Ex: `tb_endereco`).
4.  **Movimentação:** O registro histórico de todas as transações (entradas, saídas, ajustes) (Ex: `tb_movimentacao`).
5.  **Usuário:** O operador ou gestor que executa a ação (Ex: `tb_usuario`).
6.  **Fornecedor:** A origem das mercadorias (Ex: `tb_fornecedor`).
7.  **Tabelas de Apoio:** Domínios controlados (Status, Motivos, Categorias).

-----

## 9\. Riscos de Negócio e Projeto

Esta seção rastreia os riscos de negócio e compliance identificados no `SGE_15_Gestao_de_Riscos.md`.

| ID Risco | Categoria | Descrição do Risco | Classificação | Mitigação Principal (Requisito Semente) |
|---|---|---|---|---|
| R-002 | Operacional | Divergências entre estoque físico e sistema | **Crítico** | P05 (Inventário Cíclico) e RF-P04-003 (Bloqueio de Saldo Negativo) |
| R-007 | Auditoria/Fraude | Manipulação indevida de movimentações | **Crítico** | RNF-AUD-001 (Logs Imutáveis) e RNF-SEG-002 (SoD / RBAC) |
| R-001 | Tecnológico | Falha no servidor do banco de dados PostgreSQL 15 | **Alto** | RNF-CONT-001/002 (RTO/RPO) e RNF-DISP-001 (Uptime) |
| R-003 | Segurança | Acesso indevido a dados confidenciais (custos) | **Alto** | RNF-SEG-001 (JWT) e RNF-SEG-002 (RBAC) |
| R-004 | Compliance | Tratamento indevido de dados (LGPD) | **Alto** | RNF-COMP-001 (Anonimização) e RNF-AUD-002 (Retenção 5 anos) |
| R-006 | Continuidade | Paralisação total do SGE por falha crítica | **Médio** | Teste de Plano de DR (RTO/RPO) |

-----

## 10\. Especificações Técnicas (Stack Detalhada)

### 10.1 Stack de Back-End

Decisão: **Node.js + TypeScript + Express/NestJS**

| Componente | Tecnologia | Versão | Justificativa |
|---|---|---|---|
| **Runtime** | Node.js | 20 LTS | Event-driven architecture ideal para I/O intensivo (consultas DB, APIs externas). Single-threaded event loop suporta 10k+ conexões simultâneas. |
| **Linguagem** | TypeScript | 5.3+ | Type safety reduz bugs. Autocomplete e refactoring facilitam manutenibilidade. |
| **Framework Web** | Express.js ou NestJS | 4.19+ / 10+ | Express: Minimalista. NestJS: Arquitetura modular, DI, TypeScript-first, ideal para projetos grandes. |
| **ORM** | Prisma ou TypeORM | 5.7+ / 0.3+ | Prisma: Type-safe queries. TypeORM: Decorators, mais maduro. |
| **Banco de Dados** | PostgreSQL | 15+ | ACID compliant, JSON support (JSONB), excelente para dados estruturados. Suporte a transações críticas. |
| **Cache** | Redis | 7+ | Performance extrema (sub-millisecond). Cache de produtos, sessões JWT, filas BullMQ, pub/sub para WebSocket. |
| **Task Queue** | BullMQ | 5+ | Baseado em Redis, retry inteligente, jobs agendados. Essencial para processamento assíncrono (P02, P07, P08). |
| **WebSocket** | Socket.io ou ws | 4.7+ / 8.16+ | Socket.io: Fallback automático. ws: Minimalista, performance superior. |
| **Autenticação** | JWT (jsonwebtoken) + Passport.js | 9.0+ / 0.7+ | JWT stateless (escalável), Passport.js abstrai estratégias. `bcrypt` para hashing de senhas. |
| **Validação** | Zod ou Joi | 3.22+ / 17+ | Zod: Type-safe, integração TypeScript nativa. |
| **Logging** | Winston ou Pino | 3.11+ / 8.19+ | Pino: Performance superior, JSON structured logs. |
| **Testes** | Jest ou Vitest | 29+ / 1.5+ | Jest: Ecossistema robusto. Vitest: Mais rápido, suporte ESM nativo. |
| **Process Manager** | PM2 | 5.3+ | Cluster mode (aproveita múltiplos cores), auto-restart, load balancing, zero-downtime reload. |

### 10.2 Stack de Front-End

Decisão: **React + Next.js + TypeScript**

| Componente | Tecnologia | Versão | Justificativa |
|---|---|---|---|
| **Framework** | Next.js | 14+ | SSR (Server-Side Rendering) para performance e SEO, App Router, otimizações automáticas. |
| **Linguagem** | TypeScript | 5.3+ | Type safety, compartilha tipos com back-end Node.js. |
| **Biblioteca UI** | React | 18+ | Ecossistema maduro, componentes reutilizáveis, hooks modernos. |
| **Estilização** | Tailwind CSS + shadcn/ui | 3.4+ | Utility-first CSS acelera desenvolvimento, componentes acessíveis (Radix UI). |
| **Gerenciamento de Estado** | Zustand + React Query | 4.5+ / 5.0+ | Zustand: leve (global); React Query: cache inteligente de API. |
| **Formulários** | React Hook Form + Zod | 7.50+ / 3.22+ | Performance (uncontrolled forms), validação type-safe com Zod. |
| **Gráficos/Dashboards** | Recharts / Chart.js | 2.10+ | Gráficos responsivos para dashboards (P08). |
| **Testes** | Vitest + Playwright | 1.5+ / 1.42+ | Vitest: testes unitários rápidos; Playwright: testes E2E cross-browser. |
| **Mobile** | PWA (Progressive Web App) | - | Instalável em dispositivos móveis (coletores de dados), offline-first. |

### 10.3 Infraestrutura e DevOps

Decisão: **Cloud AWS + Docker + ECS**

| Componente | Tecnologia | Justificativa |
|---|---|---|
| **Provedor Cloud** | AWS (Amazon Web Services) | Compliance (ISO 27001), datacenter em São Paulo (baixa latência). |
| **Containerização** | Docker + ECS (Elastic Container Service) | Docker isola dependências Node.js, ECS simplifica orquestração. |
| **CI/CD** | GitHub Actions | Integração com repositório GitHub, deploy automatizado. |
| **Load Balancer** | Application Load Balancer (ALB) | Balanceamento L7 (HTTP/HTTPS), health checks, SSL/TLS termination, WAF. |
| **Banco de Dados** | Amazon RDS PostgreSQL 15 | Backups automáticos, replicação multi-AZ (alta disponibilidade). |
| **Cache** | Amazon ElastiCache (Redis) | Gerenciado, replicação multi-AZ, escalabilidade. |
| **Armazenamento** | Amazon S3 | Durabilidade (11 noves), versionamento, criptografia, conformidade LGPD. |
| **Process Manager** | PM2 (dentro container) | Cluster mode, auto-restart, zero-downtime reload. |
| **Monitoramento** | CloudWatch + Prometheus + Grafana + Sentry | Observabilidade completa (Infra, Aplicação, Erros). |
| **Logs** | CloudWatch Logs + Winston/Pino | Centralização de logs, retenção configurável (5 anos para auditoria). |
| **Segurança** | AWS IAM + Security Groups + WAF + Secrets Manager | Controle de acesso granular, firewall de rede, proteção OWASP Top 10. |

### 10.4 Integração e Comunicação

| Protocolo | Uso | Características |
|---|---|---|
| **REST API (HTTPS)** | Operações CRUD e consultas | Stateless, cacheable, JSON, versionamento (/api/v1/) |
| **WebSocket (WSS)** | Notificações em tempo real | Full-duplex, baixa latência, persistente, Socket.io |
| **Formato de Dados** | JSON (application/json; charset=utf-8) | Node.js trabalha nativamente com JSON |
| **Autenticação** | JWT (JSON Web Tokens) + RBAC | `Authorization: Bearer <token>`. Access (15m), Refresh (7d em Redis) |
| **Autorização** | RBAC (Role-Based Access Control) | Permissões granulares (ex: `estoque.read`, `inventario.approve`) |
| **Rate Limiting** | 50 req/min/usuário (express-rate-limit) | Resposta 429 (Too Many Requests) com storage Redis |
| **Documentação API** | OpenAPI 3.0 (Swagger) | Acesso em `/docs`. Geração automática |

-----

## 11\. Entregáveis e Marcos do Projeto

| Marco | Entregável | Data Prevista |
|---|---|---|
| M1 | Documento de Visão e Escopo (Constituição v1.0) | 29/10/2025 |
| M2 | SIPOC e BPMN dos Processos (P01-P08) | 31/10/2025 |
| M3 | Modelo de Dados e Regras de Negócio | 02/11/2025 |
| M4 | Protótipo Integrado (Frontend + API + DB) | 10/11/2025 |
| M5 | MVP Validado e Testado (Foco em P01, P04, P06) | 20/11/2025 |
| M6 | Go-Live (Rollout Fase 1) | (Prazo 6 meses) |

-----

## 12\. Controle de Versão e Aprovação

| Campo | Valor |
|---|---|
| **Versão** | 2.2D (Semente de Pipeline) |
| **Data** | 29/10/2025 |
| **Framework** | NexusSW v1.1.0 - Especificações Técnicas Completas |
| **Stack Decidida** | Node.js + TypeScript + React/Next.js + AWS ECS |
| **Elaborado por** | FRANCISCO ARAÚJO (Gerente do Projeto) |
| **Revisado por** | **Comitê de Governança e TI – Supermercado Fortal** |
| **Aprovado por** | **Direção Executiva – Supermercado Fortal** |
| **Observações** | Esta **Constituição do Projeto** (v1.0) foi auditada e enriquecida com as premissas de negócio, governança, dados e riscos para todos os artefatos do projeto. Ela serve como a **fonte-semente de verdade** para o pipeline de geração cumulativa de artefatos. |