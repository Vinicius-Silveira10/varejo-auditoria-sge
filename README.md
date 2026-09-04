# SGE Fortal – Sistema de Gestão de Estoque e Auditoria de Varejo

[![NestJS](https://img.shields.io/badge/Backend-NestJS%2011-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/UI-React%2019-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript%205-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2015-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/ORM-Prisma%205.22-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Redis](https://img.shields.io/badge/Cache%20%26%20Queue-Redis-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Containers-Docker%20Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

> **SGE Fortal** é uma plataforma corporativa e integrada de gestão logística e auditoria de estoques desenvolvida para a rede de supermercados Fortal. O sistema conecta a operação física do Centro de Distribuição (CD) às lojas, garantindo rastreabilidade ponta a ponta, eliminação de divergências de inventário e governança rigorosa em movimentações críticas.

---

## 📌 Sumário

- [Visão Geral e Objetivos](#-visão-geral-e-objetivos)
- [Arquitetura da Solução](#-arquitetura-da-solução)
- [Macroprocessos e Regras de Negócio (SIPOC)](#-macroprocessos-e-regras-de-negócio-sipoc)
- [Stack Tecnológica](#-stack-tecnológica)
- [Estrutura do Repositório](#-estrutura-do-repositório)
- [Pré-requisitos e Instalação](#-pré-requisitos-e-instalação)
- [Executando a Aplicação](#-executando-a-aplicação)
  - [1. Ambiente de Desenvolvimento Local](#1-ambiente-de-desenvolvimento-local)
  - [2. Ambiente de Staging (Docker Compose)](#2-ambiente-de-staging-docker-compose)
- [Qualidade e Suíte de Testes](#-qualidade-e-suíte-de-testes)
  - [Testes Unitários](#testes-unitários)
  - [Testes E2E Isolados (Banco Efêmero)](#testes-e2e-isolados-banco-efêmero)
  - [Testes de Concorrência e Hardening](#testes-de-concorrência-e-hardening)
- [Segurança e Compliance](#-segurança-e-compliance)
- [Documentação Complementar](#-documentação-complementar)

---

## 🎯 Visão Geral e Objetivos

O projeto visa resolver os principais gargalos da cadeia de suprimentos varejista: divergência entre saldo físico e contábil, perdas por validade expirada, falta de auditoria nas baixas de produtos e morosidade nos inventários.

| Indicador | Meta do Sistema | Mecanismo de Garantia |
| :--- | :--- | :--- |
| **Acurácia de Estoque** | **≥ 98%** | Inventário cíclico com contagem cega e recálculo transacional |
| **Ruptura em Itens Críticos** | **≤ 3%** | Alertas preditivos de ponto de reposição e ocupação |
| **Política de Validade** | **100% FEFO** | Algoritmo determinístico de separação (*First Expired, First Out*) |
| **Integridade de Auditoria** | **100% Imutável** | Encadeamento criptográfico de hash (*Chain Pointer / Tamper-evident*) |
| **Tempo de Inventário** | **≤ 4 horas** | Interface mobile e web otimizada para coletores e tablets |

---

## 🏗 Arquitetura da Solução

O sistema adota os princípios de **Clean Architecture**, **Domain-Driven Design (DDD)** e segregação estrita de responsabilidades:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                       CAMADA DE APRESENTAÇÃO (UI)                       │
│                                                                         │
│   Next.js 16 (App Router) + React 19 + Tailwind CSS + Socket.io Client  │
│   [Login] [Dashboard KPIs] [Putaway] [Picking] [Inventário] [Aprovações]│
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTPS (REST) + WSS (WebSockets)
┌────────────────────────────────────▼────────────────────────────────────┐
│                    CAMADA DE APLICAÇÃO (NESTJS API)                     │
│                                                                         │
│   • Auth & RBAC Guards (JWT stateless + tokenVersion + Cookies HttpOnly)│
│   • Gateways em Tempo Real (Socket.io DashboardGateway)                 │
│   • Controllers REST & DTOs validados via class-validator               │
│   • Casos de Uso Core (Regras de Domínio, FEFO, TOCTOU Lock, Custo)     │
│   • Filas Assíncronas (BullMQ + Redis)                                  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│                          CAMADA DE DADOS & INFRA                        │
│                                                                         │
│   • PostgreSQL 15 (Prisma ORM): Transações ACID e Travas Concorrentes   │
│   • Redis: Filas de trabalho, cache e pub/sub de eventos                │
│   • Nginx: Proxy reverso e terminação TLS em staging/produção           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Macroprocessos e Regras de Negócio (SIPOC)

O sistema cobre 8 macroprocessos interligados do ciclo logístico:

1. **P01 - Recebimento de Mercadorias**: Ingestão e validação do XML de NF-e via `fast-xml-parser`, conferência cega de quantidades recebidas e geração automática de lotes com controle de shelf life.
2. **P02 - Atualização de Custo Médio**: Recálculo automático do Custo Médio Ponderado a cada entrada, persistindo histórico completo no log de custos.
3. **P03 - Armazenagem (Putaway)**: Sugestão algorítmica de endereçamento baseada em capacidade física, tipo de produto e zonas de armazenagem.
4. **P04 - Separação e Movimentação (Picking)**: Aplicação estrita da política FEFO para produtos perecíveis, bloqueio absoluto de saldo negativo e controle de concorrência pessimista (`SELECT FOR UPDATE`) para mitigar vulnerabilidades TOCTOU.
5. **P05 - Inventário Cíclico**: Ciclo de contagens cegas pelo operador sem exibição do saldo esperado, geração automática de divergências e recontagens.
6. **P06 - Ajustes de Estoque**: Alçada de dupla aprovação (Gestor + Controladoria) para divergências com desvio percentual `|Δ%| > 2%` ou valor financeiro `|Δ valor| > R$ 1.000,00`.
7. **P07 - Auditoria e Rastreabilidade**: Registro de todas as mutações de dados com hash SHA-256 encadeado (*blockchain-like pointer*), detecção de violações e exportação de relatórios para auditoria externa.
8. **P08 - Dashboards e Gestão**: Painéis gerenciais com métricas de Acurácia, OTIF, Ocupação do CD, Rupturas e Dead Stock, atualizados em tempo real via WebSocket com fallback para HTTP polling.

---

## 💻 Stack Tecnológica

### Backend
- **Runtime & Linguagem**: Node.js 20+ LTS, TypeScript 5.x
- **Framework**: NestJS 11 (Módulos, Injeção de Dependências, Guards, Interceptors)
- **Banco de Dados & ORM**: PostgreSQL 15, Prisma ORM 5.22
- **Comunicação em Tempo Real**: Socket.io / NestJS WebSockets
- **Mensageria & Filas**: Redis com BullMQ
- **Segurança**: Passport-JWT, Bcrypt, Throttler (Rate Limiting)
- **Documentação de API**: Swagger / OpenAPI 3.0 (`/api/docs`)

### Frontend
- **Framework Web**: Next.js 16 (App Router com SSR)
- **Biblioteca de UI**: React 19, Tailwind CSS v4
- **Comunicação de Dados**: Fetch API tipada + Socket.io-client
- **Feedback Visual**: ToastProvider desacoplado e acessível

### Infraestrutura & Testes
- **Ambientes Isolados**: Docker & Docker Compose
- **Testes Unitários & E2E**: Jest 29/30, Supertest, React Testing Library, JSDOM
- **Proxy & Servidor Web**: Nginx 1.25

---

## 📂 Estrutura do Repositório

```text
.
├── backend/                  # Aplicação NestJS (API REST, WebSockets e Domínio)
│   ├── prisma/               # Esquema Prisma (schema.prisma), migrações e seeds
│   ├── scripts/              # Utilitários de execução E2E e scripts de suporte
│   ├── src/
│   │   ├── config/           # Validação fail-loud de variáveis de ambiente
│   │   ├── core/             # Domínio Puro (Entidades, Interfaces e Casos de Uso)
│   │   │   ├── domain/       # Regras puras de negócio (ex: adjustment.rules.ts)
│   │   │   ├── interfaces/   # Contratos de repositórios e Unit of Work
│   │   │   └── use-cases/    # Implementação dos casos de uso (P01 a P08)
│   │   └── infrastructure/   # Implementações concretas (Controllers, Prisma, Security)
│   └── test/                 # Testes E2E (auth, auditoria, concorrência, picking)
├── frontend/                 # Aplicação Next.js 16 (Interface do Usuário)
│   ├── src/
│   │   ├── app/              # Rotas e páginas (App Router: login, dashboard, putaway, etc.)
│   │   ├── components/       # Componentes compartilhados de interface
│   │   └── lib/              # Clientes de API, helpers de autenticação e tokens
├── deploy/                   # Modelos de configuração de infraestrutura (Nginx)
├── Escopo_Projeto/           # Especificação funcional, RASCI, BPMN e regras de negócio
├── docker-compose.yml        # Banco de dados e Redis para desenvolvimento local
├── docker-compose.staging.yml# Stack completa containerizada para staging
└── docker-compose.e2e.yml    # Banco PostgreSQL isolado para testes E2E automatizados
```

---

## 🚀 Pré-requisitos e Instalação

### Pré-requisitos
- [Node.js](https://nodejs.org/) versão 20 LTS ou superior
- [Docker](https://www.docker.com/) e [Docker Compose](https://docs.docker.com/compose/)
- Gerenciador de pacotes `npm`

### Clonando o Projeto
```bash
git clone https://github.com/Vinicius-Silveira10/varejo-auditoria-sge.git
cd Supermercado
```

---

## ⚙️ Executando a Aplicação

### 1. Ambiente de Desenvolvimento Local

#### Passo 1: Inicializar Banco de Dados e Redis
Na raiz do projeto, inicie os containers de infraestrutura:
```bash
docker-compose up -d
```
> O PostgreSQL iniciará na porta **5433** e o Redis na porta **6379**.

#### Passo 2: Configurar e Iniciar o Backend
```bash
cd backend
cp .env.example .env      # Configure suas variáveis caso necessário
npm install
npx prisma migrate dev    # Aplica as migrações no banco de dados
npm run prisma:seed       # Executa o seed com usuários e dados padrão
npm run start:dev         # Inicia a API em modo watch (http://localhost:3000)
```
Acesse a documentação Swagger em: `http://localhost:3000/api/docs`

#### Passo 3: Configurar e Iniciar o Frontend
Em outro terminal:
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev               # Inicia o Next.js (http://localhost:3001 ou 3000)
```
Acesse o sistema no navegador: `http://localhost:3000`

---

### 2. Ambiente de Staging (Docker Compose)

Para subir o ecossistema completo simulando staging (Postgres + Redis + Backend + Frontend integrados):

```bash
# Copie o template de ambiente de staging
cp .env.staging.example .env.staging

# Inicialize toda a stack
docker-compose -f docker-compose.staging.yml --env-file .env.staging up --build -d
```
O frontend estará acessível na porta **3001** e o backend na porta **3000**.

---

## 🧪 Qualidade e Suíte de Testes

O projeto adota a cultura de testes automatizados com cobertura rigorosa para todas as regras de negócio críticas.

### Testes Unitários
```bash
# No diretório backend:
cd backend
npm run test          # Executa todos os testes unitários
npm run test:cov      # Gera relatório de cobertura de código (LCOV)

# No diretório frontend:
cd frontend
npm run test          # Executa testes de componentes e páginas (JSDOM)
```

### Testes E2E Isolados (Banco Efêmero)
Os testes de ponta a ponta utilizam um container de banco de dados efêmero dedicado (Postgres porta **5434**) gerenciado pelo script `scripts/run-e2e.ts`. A cada execução, o ambiente é criado do zero, migrado, testado e destruído:

```bash
cd backend
npm run test:e2e
```

> **Dica para desenvolvimento ágil**: Para manter o banco efêmero ativo entre testes consecutivos sem destruí-lo:
> ```bash
> env E2E_KEEP_ALIVE=true npm run test:e2e
> ```

### Testes de Concorrência e Hardening
A suíte inclui baterias de testes específicos para cenários extremos de alta concorrência:
- **`picking-deadlock.e2e-spec.ts`**: Validação de travas pessimistas e ordenação de locks para prevenção de deadlocks.
- **`chain-pointer.concurrency.e2e-spec.ts`**: Verificação de integridade da cadeia de hashes sob concorrência de escritas.
- **`receive-batch.concurrency.e2e-spec.ts`**: Validação de consistência em recebimento simultâneo de lotes.

---

## 🔒 Segurança e Compliance

- **Controle de Acesso Baseado em Perfis (RBAC)**:
  - `OPERADOR`: Execução de contagens, recebimento e putaway.
  - `GESTOR`: Análise de divergências, dashboards e aprovação de ajustes de nível 1.
  - `ADMIN`: Gestão de usuários, parâmetros globais e configurações de segurança.
  - `AUDITOR`: Acesso a logs de auditoria imutáveis e relatórios de conformidade.
- **Prevenção de Ataques de Temporização (Timing Attacks)**:
  - Verificação de senhas de usuários inexistentes contra hashes simulados (dummy bcrypt) em tempo constante.
- **Ciclo de Vida de Sessão Seguro**:
  - Emissão de JWT via cookies seguros `HttpOnly`, `SameSite` e flag `Secure`.
  - Invalidação instantânea de sessões ao alterar senha ou desativar usuário via atributo `tokenVersion`.
- **Validação Fail-Loud de Variáveis de Ambiente**:
  - O sistema aborta a inicialização caso secrets ou chaves de produção estejam com valores inseguros ou ausentes.

---

## 📚 Documentação Complementar

Na pasta [`Escopo_Projeto/`](./Escopo_Projeto) encontram-se os documentos formais que orientaram a concepção do sistema:
- `NEXUSSW_01_Visao_Escopo.md`: Documento de Visão e Escopo (Constituição v1.0).
- `NEXUSSW_02_Stakeholders_RASCI.md`: Matriz de Responsabilidades RASCI.
- `NEXUSSW_03_SIPOC_e_BPMN.md`: Modelagem dos processos em BPMN e diagramas SIPOC.
- `NEXUSSW_05_Regras_de_Negocio.md`: Catálogo completo de regras operacionais e de governança.
- `SGE_15_Gestao_de_Riscos.md`: Matriz de riscos operacionais, fraude e compliance.

---

## 👥 Autor e Governança

- **Desenvolvimento e Arquitetura**: Vinicius Silveira
- **Organização**: Supermercado Fortal LTDA
- **Padrão Normativo**: ABNT Técnico / Arquitetura Limpa
