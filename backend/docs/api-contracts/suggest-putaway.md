# Contrato de API — Sugestão de Endereçamento (Suggest Putaway)

## Endpoint

| Método | Path | Auth |
|--------|------|------|
| `GET` | `/addresses/suggest-putaway` | Bearer JWT (qualquer perfil autenticado) |

## Request

### Query Parameters

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|:-----------:|-----------|
| `produtoId` | `number` | ✅ | ID do produto a ser armazenado |
| `quantidade` | `number` | ✅ | Quantidade de unidades a armazenar (deve ser > 0) |

### Exemplo de Request

```
GET /addresses/suggest-putaway?produtoId=42&quantidade=100
Authorization: Bearer eyJhbGciOi...
```

---

## Response

### Estrutura

```typescript
{
  message: string;
  data: {
    produtoId: number;
    perecivel: boolean;
    tipoZonaRequerida: string;   // 'SECO' | 'REFRIGERADO' | 'CONGELADO'
    sugestoes: Array<{
      enderecoId: number;
      codigo: string;             // Ex: "A-01-01"
      zona: string;               // Ex: "A"
      tipoZona: string;           // 'SECO' | 'REFRIGERADO' | 'CONGELADO'
      espacoDisponivel: number;   // Capacidade restante no endereço
      score: number;              // Pontuação de prioridade (maior = melhor)
    }>;
    aviso?: string;               // ⚠️ Campo opcional — ver seção abaixo
  }
}
```

### Campo `aviso` (opcional)

O campo `aviso` é uma string **opcional** adicionada ao response a partir da
regra de negócio **RN-ARM-003**. Ele é preenchido **exclusivamente** quando:

1. O produto é **perecível** (`perecivel: true`)
2. **Não há endereços disponíveis** na zona térmica requerida (ex.: `REFRIGERADO`)
3. A lista `sugestoes` retorna **vazia** (`[]`)

Nesse cenário, em vez de redirecionar silenciosamente para uma zona alternativa
(comportamento removido na auditoria de segurança), o sistema retorna uma
justificativa explícita no campo `aviso`.

> **Requisito para o front-end:** quando `aviso` vier preenchido, exibir a
> mensagem como alerta/notificação para o operador, já que a lista de
> `sugestoes`/endereços virá vazia nesse cenário. Este campo é **aditivo** e
> não quebra clients existentes que ainda não o leem, mas sem tratá-lo o
> operador não recebe a justificativa do bloqueio.

---

## Exemplos de Response

### ✅ Cenário Normal — Endereços encontrados

```json
{
  "message": "Sugestões de armazenagem calculadas com sucesso",
  "data": {
    "produtoId": 42,
    "perecivel": true,
    "tipoZonaRequerida": "REFRIGERADO",
    "sugestoes": [
      {
        "enderecoId": 15,
        "codigo": "R-02-03",
        "zona": "R",
        "tipoZona": "REFRIGERADO",
        "espacoDisponivel": 200,
        "score": 85
      },
      {
        "enderecoId": 18,
        "codigo": "R-03-01",
        "zona": "R",
        "tipoZona": "REFRIGERADO",
        "espacoDisponivel": 150,
        "score": 72
      }
    ]
  }
}
```

> Note que `aviso` **não aparece** no response — ele é omitido quando não há bloqueio.

### ⚠️ Cenário de Bloqueio — Zona indisponível para perecível (RN-ARM-003)

```json
{
  "message": "Sugestões de armazenagem calculadas com sucesso",
  "data": {
    "produtoId": 42,
    "perecivel": true,
    "tipoZonaRequerida": "REFRIGERADO",
    "sugestoes": [],
    "aviso": "RN-ARM-003: Nenhum endereço REFRIGERADO disponível. Produto perecível não pode ser armazenado em zona alternativa sem autorização."
  }
}
```

---

## Códigos de Erro

| Status | Cenário |
|--------|---------|
| `400` | `produtoId` ou `quantidade` inválidos (não numéricos ou ≤ 0) |
| `400` | Produto não encontrado ou desativado (RN-ARM-002) |
| `401` | Token JWT ausente ou inválido |

---

## Regras de Negócio Relacionadas

| Regra | Descrição |
|-------|-----------|
| **RN-ARM-001** | Capacidade: só sugere endereços com espaço suficiente para a quantidade |
| **RN-ARM-002** | Produto deve existir e estar ativo |
| **RN-ARM-003** | Produto perecível deve ser direcionado à zona térmica correta; sem fallback automático |
| **RN-ARM-004** | Filtro de capacidade: `capacidade - ocupado >= quantidade` |
| **GAP-008** | Priorização por curva ABC: produtos da curva A são priorizados em endereços da zona A |

---

## Histórico de Alterações

| Data | Alteração |
|------|-----------|
| 2026-07-09 | Adicionado campo `aviso` (opcional) ao response. Removido fallback silencioso para zona CONGELADO. |
