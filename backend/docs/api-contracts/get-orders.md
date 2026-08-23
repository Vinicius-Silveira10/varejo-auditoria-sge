# GET /orders

Retorna uma lista paginada de pedidos de expedição pendentes, priorizando a lógica FEFO (First Expired, First Out) quando aplicável ou ordenação padrão.

## Roles Permitidas
- `OPERADOR`
- `GESTOR`
- `ADMIN`

## Query Parameters
| Parâmetro | Tipo | Obrigatório | Descrição | Padrão |
| :--- | :--- | :--- | :--- | :--- |
| `page` | `number` | Não | Página atual (1-indexed). | `1` |
| `limit` | `number` | Não | Quantidade máxima de pedidos retornados. | `10` |
| `status` | `string` | Não | Filtra pedidos por status (ex: `PENDENTE`). | - |

## Request Example
```http
GET /orders?status=PENDENTE&page=1&limit=5 HTTP/1.1
Authorization: Bearer <jwt_token>
```

## Response Example (200 OK)
```json
{
  "data": [
    {
      "id": 1,
      "status": "PENDENTE",
      "createdAt": "2026-08-19T10:00:00.000Z",
      "updatedAt": "2026-08-19T10:00:00.000Z",
      "itens": [
        {
          "id": 101,
          "produtoId": 99,
          "quantidadeSolicitada": 5,
          "quantidadeSeparada": 0
        }
      ]
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 5,
    "totalPages": 1
  }
}
```

## Error Responses

### 401 Unauthorized
Sem token ou com token inválido.
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden
Perfil não autorizado (ex: faltam as roles OPERADOR, GESTOR ou ADMIN).
```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```
