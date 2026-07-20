# API Contract: Ajustes de Estoque Pendentes

## GET `/adjustments/pending`

Lista as solicitações de ajuste de estoque, filtradas por status. Este endpoint já retorna os dados de Lote e Produto populados para evitar N+1 no frontend.

### Regras de Negócio (RBAC)
- Requer Autenticação JWT.
- Somente perfis `GESTOR` e `ADMIN` podem acessar. Perfil `OPERADOR` recebe HTTP 403.

### Query Parameters

| Nome | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `status` | string | Não | Filtro por status (`PENDENTE`, `APROVADO`, `REJEITADO`). O padrão é `PENDENTE`. |

### Resposta de Sucesso (HTTP 200)

```json
[
  {
    "id": 1,
    "loteId": 10,
    "quantidadeDelta": 5,
    "motivo": "Sobra encontrada no inventário",
    "valorDelta": 50.00,
    "statusAprovacao": "PENDENTE",
    "solicitanteId": 3,
    "criadoEm": "2023-10-27T10:00:00Z",
    "atualizadoEm": "2023-10-27T10:00:00Z",
    "lote": {
      "numeroLote": "LOTE-12345",
      "produto": {
        "sku": "SKU-001",
        "descricao": "Produto de Teste"
      }
    }
  }
]
```

### Respostas de Erro

- **400 Bad Request:** Status inválido fornecido na query string.
- **401 Unauthorized:** Token JWT ausente, expirado ou inválido.
- **403 Forbidden:** Usuário não tem o perfil adequado (ex: `OPERADOR`).
