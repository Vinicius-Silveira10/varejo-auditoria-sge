# ADR 0002: Uso de Timestamp Local vs NTP Corporativo

## Contexto e Problema
A especificação do sistema (RN-TRV-005) exige o uso de um "carimbo de tempo sincronizado via NTP corporativo" para garantir a irrefutabilidade temporal da cadeia de custódia (movimentações de estoque, logs de custo, etc.).
Atualmente, o backend utiliza a função `@default(now())` do banco de dados local em todas as tabelas (via Prisma). O banco de dados captura o horário local do servidor onde está hospedado.

**Risco prático do `@default(now())` local:**
Se o relógio do servidor de banco de dados for alterado (intencional ou acidentalmente), os eventos subsequentes na cadeia de auditoria serão registrados com timestamps incorretos (no passado ou no futuro). Embora o encadeamento dos hashes (cadeia de blocos) continue criptograficamente íntegro e aponte a ordem lógica dos eventos, a **ordem temporal aparente** no relatório visual e na base poderia ser questionada em uma auditoria fiscal ou legal, comprometendo a credibilidade temporal das ações (ex: aprovar um ajuste com data anterior ao momento em que a mercadoria entrou de fato no estoque).

## Opções Técnicas Consideradas

1. **Serviço de NTP Corporativo Dedicado (Ideal para Produção Real):**
   - **Pró:** Atende plenamente à norma. O servidor da aplicação/banco de dados é atrelado a um relógio atômico da empresa ou do provedor de nuvem, bloqueado para modificação manual.
   - **Contra:** Requer infraestrutura corporativa (VPCs, regras de firewall, servidores dedicados) que frequentemente não está disponível para um projeto conduzido por um desenvolvedor/solo em fase de MVP e Staging.

2. **Serviço Externo de Timestamping na Aplicação (Time-Stamping Authority - TSA):**
   - **Pró:** Ao invés do banco de dados gerar o timestamp, a aplicação Node.js consulta uma API externa (ou pacote NTP) a cada transação e envia a data explícita para o banco.
   - **Contra:** Introduz latência de rede crítica em cada operação de auditoria e um ponto único de falha. Se o NTP externo ficar indisponível, a criação de Movimentações para.

3. **Aceitar o Risco Temporariamente (Dívida Técnica):**
   - **Pró:** Permite avanço imediato para o MVP/Staging sem fricção de infraestrutura. A integridade da cadeia de blocos (hash) já cobre 90% da segurança exigida, protegendo contra inserções e deleções fraudulentas.
   - **Contra:** Desvio temporário da especificação RN-TRV-005.

## Decisão (Recomendação)

**Recomendamos a Opção 3 (Aceitar o Risco Temporariamente).**
Dado que a equipe atual é composta apenas por um desenvolvedor/PO e o foco imediato é estabilizar a versão 1.0 para simulação de UAT e Staging, a complexidade de forçar um NTP estrito via software não justifica o atraso.

A decisão arquitetural tomada é **manter o uso de `@default(now())` na camada de banco de dados** por enquanto.

## Consequências e Próximos Passos
- **Mitigação:** O ambiente de deploy (Docker, AWS, etc.) deve ser configurado com sincronização de tempo padrão (ex: `chrony` ou `ntpd` rodando no host), o que na prática já vincula o servidor a servidores NTP públicos, reduzindo drasticamente o risco sem precisar de código extra.
- **Condição de Revisão:** Esta dívida técnica explícita deve ser revisitada **antes do Go-Live em Produção Real**. Na fase de produção, a equipe de Infraestrutura/DevOps deverá assinar e garantir que as instâncias do banco de dados possuem bloqueio contra manipulação de relógio e sincronização com um NTP corporativo ou de Cloud provado.
