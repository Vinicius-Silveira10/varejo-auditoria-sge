		# 🏢 Supermercado Fortal
## SGE – Sistema de Gestão de Estoque
### Documento: Regras de Negócio – Versão 1.0
**Elaborado por:** Vinicius Silveira

> **Escopo desta versão:** documento unificado resultante da análise profunda dos dois artefatos anexos (versões Markdown e DOCX), com **conciliação de conteúdo, padronização de formato e alinhamento com os 8 processos SGE** (Operacional, Gerencial e Estratégico). Regras consolidadas em sintonia com **PRC-REC-001, PRC-ARM-002, PRC-MOV-003, PRC-INV-004, PRC-AJU-005, PRC-REL-006, PRC-CST-007, PRC-DASH-008**.

---

## Sumário
1. Notas de Consolidação e Correções
2. Convenções de Identificação e Estrutura de Regra
3. Regras de Negócio por Processo (Catálogo Consolidado)
   - 3.1 PRC-REC-001 — Recebimento de Mercadorias
   - 3.2 PRC-ARM-002 — Armazenagem (Putaway)
   - 3.3 PRC-MOV-003 — Movimentação & Expedição
   - 3.4 PRC-INV-004 — Inventário Cíclico
   - 3.5 PRC-AJU-005 — Ajustes de Estoque
   - 3.6 PRC-REL-006 — Relatórios & Auditoria
   - 3.7 PRC-CST-007 — Atualização de Custo Médio (AVG)
   - 3.8 PRC-DASH-008 — Dashboards & Gestão
4. Regras Transversais (Governança / Segurança / LGPD)
5. Rastreabilidade (RTM): Regra → Processo → RF/RNF → KPI
6. Critérios de Conformidade e Prioridade
7. Aprovação e Controle de Versão

---

## 1. Notas de Consolidação e Correções

**Fontes analisadas e conciliadas:**  
- Regras em **Markdown (v1.0)** — base estrutural e tabelas por módulo. fileciteturn4file0  
- Regras em **DOCX (v1.0)** — conteúdo textual detalhado e novas regras/limiares. fileciteturn4file1

**Principais divergências identificadas e resolvidas:**  
- **Dupla aprovação em ajustes:** O DOCX usa **R$ 500,00**; os processos SGE e decisões recentes usam **limites condicionais ±2% ou ±R$ 1.000,00**. **Padrão final:** aplicar **dupla aprovação** **somente** quando `|Δ%| > 2%` **ou** `|Δ valor| > R$ 1.000,00` (harmonizado com PRC-AJU-005).  
- **FEFO e perecíveis:** Ambos os documentos tratam FEFO; padronizado para **bloqueio de expedição** de vencidos e **obrigatoriedade de lote/validade** em recebimento e inventário.  
- **Imutabilidade de logs e retenção:** Consolidado para **log imutável**, **hash/encadeamento** e **retenção mínima de 5 anos** (coerente com PRC-REL-006).  
- **Endereçamento dinâmico (classes B/C) e validação por código de barras:** Mantidos e ligados ao **PRC-ARM-002** (putaway/endereço).  
- **Cálculo de custo médio (AVG):** Ajustado para **não alterar** custo por ajuste/inventário; **somente recebimento** recalcula CMP (PRC-CST-007 + PRC-REC-001).

---

## 2. Convenções de Identificação e Estrutura de Regra

Cada regra segue o padrão: **RN-<PROC>-NNN**, onde `<PROC> ∈ {REC, ARM, MOV, EXP, INV, AJU, REL, CST, DASH, TRV}`.  
**Campos:** ID, Título, Descrição, Condição, Ação Esperada, Impacto, **Fonte (Processo/Política)**, **Criticidade**.

---

## 3. Regras de Negócio por Processo (Catálogo Consolidado)

### 3.1 PRC-REC-001 — Recebimento de Mercadorias
| ID | Título | Descrição | Condição | Ação Esperada | Impacto | Fonte | Crit. |
|---|---|---|---|---|---|---|---|
| RN-REC-001 | Conferência automática NF-e | Validar NF-e (XML) vs pedido: quantidades, preços, unidade | Importação NF-e | Status **Conferido**/**Divergente** c/ apontamentos | Integridade fiscal/estoque | Processo Recebimento | Alta |
| RN-REC-002 | Bloqueio de recebimento duplicado | Impedir mesma NF-e (nº, série, CNPJ) | Cadastro NF-e | Erro “NF-e já registrada” | Evita duplicidade | Modelo de Dados | Alta |
| RN-REC-003 | Lote/validade obrigatórios | Perecíveis exigem lote/validade e registro fotográfico quando aplicável | Item perecível | Campos obrigatórios + alerta | Rastreabilidade/qualidade | Política Qualidade | Alta |
| RN-REC-004 | Recalcular **AVG** | Confirmado o recebimento, recalcular custo médio ponderado | Status Conferido | Atualizar `custo_medio` | CMP fidedigno | PRC-CST-007 | Alta |

### 3.2 PRC-ARM-002 — Armazenagem (Putaway)
| ID | Título | Descrição | Condição | Ação Esperada | Impacto | Fonte | Crit. |
|---|---|---|---|---|---|---|---|
| RN-ARM-001 | Capacidade física do endereço | Não ultrapassar capacidade do endereço | Mov/Endereçamento | Bloquear operação | Segurança/ocupação | TB_ENDERECAMENTO | Alta |
| RN-ARM-002 | Sugestão automática de putaway | Sugerir endereço por zona/ocupação/classes | Pós-recebimento | Exibir sugestão | Eficiência logística | SIPOC ARM | Média |
| RN-ARM-003 | Zonas térmicas | Perecíveis apenas em zonas compatíveis | Tipo=Perecível | Bloquear destino incorreto | Qualidade/validades | Política Qualidade | Alta |
| RN-ARM-004 | Validação por código de barras | Leitura obrigatória do endereço/SKU | Endereçamento | Exigir leitura | Reduz erro de localização | Proced. TI/ARM | Alta |

### 3.3 PRC-MOV-003 — Movimentação & Expedição
| ID | Título | Descrição | Condição | Ação Esperada | Impacto | Fonte | Crit. |
|---|---|---|---|---|---|---|---|
| RN-MOV-001 | Rastreamento de origem/destino | Registrar endereço origem/destino, usuário, carimbo de tempo | Movimentar | Campos obrigatórios | Rastreabilidade | TB_MOVIMENTACAO | Alta |
| RN-EXP-001 | **FEFO na separação** | Picking prioriza menor validade | Perecíveis | Ordenar por validade | Reduz perdas | Política FEFO | Alta |
| RN-EXP-002 | Validação de pedido expedido | Não fechar pedido com itens pendentes | Fechamento | Impedir “Expedido” | Completude | Processo Expedição | Média |
| RN-EXP-003 | Conferência dupla seletiva | Pedidos de alto valor exigem dupla conferência | Valor ≥ parâmetro | Forçar 2º operador | Reduz erro | Norma Operacional | Média |

### 3.4 PRC-INV-004 — Inventário Cíclico
| ID | Título | Descrição | Condição | Ação Esperada | Impacto | Fonte | Crit. |
|---|---|---|---|---|---|---|---|
| RN-INV-001 | Congelamento durante contagem | Bloquear movimentações na área/endereço em contagem | Inventário ativo | Bloqueio automático | Evita inconsistências | TB_INVENTARIO | Alta |
| RN-INV-002 | Recontagem obrigatória | **Δ > 0,5%** requer recontagem antes do ajuste | Divergência | Gerar task de recontagem | Precisão | Política Inventário | Alta |
| RN-INV-003 | Evidência em divergência crítica | **Δ ≥ 2%** requer evidência (ex.: foto) | Divergência crítica | Exigir anexo | Suporte à auditoria | Auditoria Interna | Média |

### 3.5 PRC-AJU-005 — Ajustes de Estoque
| ID | Título | Descrição | Condição | Ação Esperada | Impacto | Fonte | Crit. |
|---|---|---|---|---|---|---|---|
| RN-AJU-001 | Motivo e classificação | Ajuste deve ter motivo classificado (perda/ganho/adm) | Solicitação | Campo obrigatório | Padroniza análises | Manual de Estoque | Média |
| RN-AJU-002 | Evidência para Δ− relevantes | Δ negativos > **0,5%** exigem evidência | Δ% > 0,5% | Bloquear sem anexo | Integridade/auditoria | Política Ajustes | Alta |
| RN-AJU-003 | Dados críticos perecíveis | Lote/validade obrigatórios em ajustes de perecíveis | Perecível | Campo obrigatório | Rastreabilidade | Política Qualidade | Alta |
| **RN-AJU-004** | **Dupla aprovação condicional** | **Exigida somente quando** `|Δ%| > 2%` **ou** `|Δ valor| > R$ 1.000,00` | Limite excedido | Aprovação Gestor + Controladoria | SoD / Governança | PRC-AJU-005 | Alta |
| RN-AJU-005 | AVG não alterado por ajuste | Ajuste afeta saldo, não custo | Lançamento | Não recalcular AVG | Consistência CMP | PRC-CST-007 | Alta |

### 3.6 PRC-REL-006 — Relatórios & Auditoria
| ID | Título | Descrição | Condição | Ação Esperada | Impacto | Fonte | Crit. |
|---|---|---|---|---|---|---|---|
| RN-REL-001 | **Log imutável** | Proibir alteração de logs após gravação | Auditoria | Registrar hash/encadeamento | Não-repúdio | Política Segurança | Alta |
| RN-REL-002 | Rastreabilidade total | Vincular movimento a usuário, data, lote/endereço | Consulta | Exibir trilha completa | Conformidade | Auditoria Fortal | Alta |
| RN-REL-003 | Retenção mínima | Manter logs por **≥ 5 anos** | Política | Impedir purge precoce | Compliance LGPD | Alta |
| RN-REL-004 | Segregação de funções (SoD) | Quem lança não aprova; quem aprova não audita | Workflow | Validar papéis | Controles internos | Governança | Alta |

### 3.7 PRC-CST-007 — Atualização de Custo Médio (AVG)
| ID | Título | Descrição | Condição | Ação Esperada | Impacto | Fonte | Crit. |
|---|---|---|---|---|---|---|---|
| RN-CST-001 | Recalcular CMP no recebimento | CMP ponderado recalculado por item | Recebimento confirmado | Atualizar `custo_medio` | Valoriza estoque | PRC-REC-001 | Alta |
| RN-CST-002 | Ajuste não altera CMP | Inventário/ajuste não mudam CMP | Ajuste/Inventário | Manter CMP | Consistência contábil | PRC-AJU-005/INV-004 | Alta |
| RN-CST-003 | FEFO não afeta CMP | Saída por validade não altera CMP | Expedição | Manter CMP | Neutralidade de custo | Política Contábil | Média |

### 3.8 PRC-DASH-008 — Dashboards & Gestão
| ID | Título | Descrição | Condição | Ação Esperada | Impacto | Fonte | Crit. |
|---|---|---|---|---|---|---|---|
| RN-DASH-001 | Tempo real (≤ 5 min) | Painéis atualizados com até 5 min de atraso | Publicação | Sinalizar stale > 5 min | Decisão tempestiva | PRC-REL-006 | Alta |
| RN-DASH-002 | RBAC por papel | Acesso e campos por perfil | Acesso | Aplicar RBAC | Segurança | Autenticação | Alta |
| RN-DASH-003 | Governança de KPI | Todo KPI tem meta, tolerância, responsável | Gestão | Validar cadastro | Consistência | Dicionário KPIs | Média |

---

## 4. Regras Transversais (Governança / Segurança / LGPD)
| Código | Descrição | Aplicação |
|---|---|---|
| RN-TRV-001 | **FEFO obrigatório** para perecíveis (armazenagem e expedição) | ARM, MOV/EXP |
| RN-TRV-002 | **Proibição de saldo negativo** | Todas as movimentações |
| RN-TRV-003 | **Soft delete** (nada é excluído fisicamente) | Tabelas principais |
| RN-TRV-004 | **Anonimização/Pseudonimização** em exportações | Relatórios/Auditoria |
| RN-TRV-005 | **Carimbo de tempo NTP** e ordem de eventos | Auditoria/Logs |

---

## 5. Rastreabilidade (RTM): Regra → Processo → RF/RNF → KPI

| Regra (ID) | Processo | RF/RNF relacionados | KPI monitorado |
|---|---|---|---|
| RN-REC-001/004 | PRC-REC-001 / PRC-CST-007 | **RF-REC-001**, **RF-CST-001** | KPI-ACUR-EST, KPI-CMP-CONS |
| RN-ARM-001/004 | PRC-ARM-002 | **RF-ARM-002** | KPI-OCUP-END, KPI-ERRO-END |
| RN-EXP-001/003 | PRC-MOV-003 | **RF-EXP-001** | KPI-OTIF, KPI-ERRO-PICK |
| RN-INV-001/002 | PRC-INV-004 | **RF-INV-001..003** | KPI-INV-ACUR, KPI-INV-TMP |
| RN-AJU-004/005 | PRC-AJU-005 | **RF-AJU-001..003** | KPI-AJU-01..04 |
| RN-REL-001/003 | PRC-REL-006 | **RF-REL-001..003** | KPI-AUD-INT, KPI-REL-TIM |
| RN-DASH-001/003 | PRC-DASH-008 | **RF-DASH-001..003** | KPI-DASH-01..04 |

> Observação: RFs/RNFs citados referem-se aos artefatos já entregues (Requisitos Funcionais e Não-Funcionais) e aos KPIs definidos em PRC-REL-006/PRC-DASH-008.

---

## 6. Critérios de Conformidade e Prioridade
| Criticidade | Descrição | Ação de Controle |
|---|---|---|
| **Alta** | Impacto direto em integridade, custo, compliance | Teste unitário/integração + log imutável |
| **Média** | Impacto operacional relevante | Revisão por pares + UAT |
| **Baixa** | Melhoria de conveniência | Avaliação pontual |

---

## 7. Aprovação e Controle de Versão
| Campo | Valor |
|---|---|
| **Versão** | 1.1 (fusão/correção de 27–28/10/2025) |
| **Base anterior** | v1.0 (MD e DOCX) — insumos reconciliados |
| **Elaborado por** | Prof. Francisco Araújo – Analista de Negócios |
| **Revisado por** | Comitê de Governança e TI – Supermercado Fortal |
| **Aprovado por** | Direção Executiva – Supermercado Fortal |
| **Observações** | Harmonizado com processos PRC-001..008; limites de aprovação de ajustes padronizados (**±2% ou ±R$ 1.000**). |

