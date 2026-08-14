# ADR-0009 — Exposição Dual do JWT: Cookie httpOnly para Browser, Token no Body para Clientes Não-Browser

**Status:** Aceito  
**Data:** 2026-08-11  
**Autores:** Vinicius Silveira  
**Revisores:** Equipe SGE Fortal  

---

## Contexto

Na Sprint "Blindagem Final para Produção", a autenticação do SGE foi migrada de `localStorage` (vulnerável a XSS por design) para cookies `httpOnly` com os atributos `Secure` e `SameSite=Strict`. O objetivo era eliminar a superfície de ataque de XSS para o fluxo do navegador web.

Durante a implementação, o campo `accessToken` foi removido do body da resposta do endpoint `POST /auth/login`, deixando apenas o cookie como mecanismo de autenticação.

Essa decisão foi revertida parcialmente após identificar que **múltiplos clientes legítimos dependem do token no body**:

1. **15 suítes de testes E2E** (39 testes) que extraem `res.body.accessToken` e o usam via header `Authorization: Bearer` para autenticar requests subsequentes no Supertest.
2. **Clientes de script e CI** (ex: `curl`, scripts de automação, pipelines GitHub Actions) que não têm contexto de cookie entre requests.
3. **Futuras integrações Android/Zebra Technologies** — coletores de dados e terminais de radiofrequência (RF) usados no chão de fábrica que operam com HTTP puro e não gerenciam cookies de sessão nativamente. Essa categoria já está antecipada na documentação Swagger do sistema.

---

## Decisão

O endpoint `POST /auth/login` retornará **ambos** simultaneamente:

1. **Cookie `httpOnly`** — para o fluxo do navegador web (frontend Next.js):
   ```
   Set-Cookie: token=<JWT>; HttpOnly; Secure; SameSite=Strict; Path=/
   ```

2. **Campo `accessToken` no body JSON** — para clientes não-browser:
   ```json
   {
     "user": { "id": 1, "email": "...", "perfil": "ADMIN" },
     "message": "Login realizado com sucesso",
     "accessToken": "<JWT>"
   }
   ```

A `JwtStrategy` (passport-jwt) aceita autenticação por qualquer uma das duas vias, em ordem de prioridade:

```typescript
// src/infrastructure/security/jwt.strategy.ts
jwtFromRequest: ExtractJwt.fromExtractors([
  (req: any) => req?.cookies?.token || null,   // 1º: cookie httpOnly (browser)
  ExtractJwt.fromAuthHeaderAsBearerToken(),    // 2º: Authorization: Bearer (não-browser)
]),
```

**Mandato ao Frontend Web:** O código do frontend Next.js **não deve ler, armazenar ou utilizar** o campo `accessToken` do body. Qualquer request autenticado deve depender exclusivamente do cookie, que é enviado automaticamente pelo browser. Violar este mandato reintroduz a vulnerabilidade XSS que a migração buscou eliminar.

---

## Análise de Tradeoffs

### Riscos introduzidos

| Risco | Severidade | Mitigação |
|---|---|---|
| `accessToken` visível no body via DevTools do browser | Média | O cookie httpOnly continua sendo o mecanismo do browser. O token no body é ignorado pelo frontend. |
| JavaScript malicioso (XSS) pode ler `accessToken` via `fetch` interceptado | Média | Mesma mitigação: o frontend não armazena esse valor em nenhuma variável acessível. O cookie httpOnly permanece inatingível por JS. |
| Token duplicado em logs de rede/proxy corporativo | Baixa | Tokens têm expiração curta (`JWT_EXPIRATION`). Logs de produção devem ser configurados para mascarar tokens. |

### Benefícios mantidos

| Benefício | Status |
|---|---|
| Cookie httpOnly protegido de XSS para o fluxo do browser | ✅ Mantido |
| `SameSite=Strict` protege contra CSRF no fluxo do browser | ✅ Mantido |
| Testes E2E funcionam sem modificação nos 39 cenários existentes | ✅ Restaurado |
| Compatibilidade futura com Android/Zebra RF terminals | ✅ Garantida |
| Compatibilidade com Swagger UI (teste manual via Bearer) | ✅ Garantida |

---

## Alternativas Consideradas e Rejeitadas

### Alternativa 1 — Remover `accessToken` do body e atualizar todos os testes E2E

Exigiria modificar ~16 arquivos E2E para extrair o token via cookie (ex: `res.headers['set-cookie']` no Supertest). Tecnicamente correto, mas:
- Aumenta complexidade dos testes sem benefício de segurança mensurável (os testes rodam em ambiente isolado).
- Exige mudança em todos os futuros testes de integração que qualquer desenvolvedor ou CI venha a escrever.

**Rejeitado** por custo/benefício desfavorável.

### Alternativa 2 — Endpoint separado `/auth/login/token` para clientes não-browser

Criar dois endpoints: um que só retorna cookie (browser) e outro que retorna apenas token (API clients). Adiciona complexidade de roteamento e manutenção sem ganho real de segurança dado que ambos emitiriam o mesmo JWT com as mesmas credenciais.

**Rejeitado** por complexidade desnecessária.

### Alternativa 3 — Estratégia baseada em `User-Agent` ou header customizado

Detectar se o cliente é browser e omitir o token do body condicionalmente. Frágil, facilmente contornável e acrescenta lógica não-determinística ao fluxo de autenticação.

**Rejeitado** por fragilidade arquitetural.

---

## Evidências de Verificação

Esta decisão foi verificada por auditoria técnica independente com execução real em 2026-08-11:

```
# Testes E2E — 2 execuções independentes (18:33 e 18:40)
Test Suites: 15 passed, 15 total
Tests:       39 passed, 39 total
Exit code: 0

# Testes unitários
Test Suites: 57 passed, 57 total
Tests:       267 passed, 267 total
Exit code: 0

# Ataque: request sem auth → 401 confirmado
STATUS: 401
BODY: {"statusCode":401,"message":"Sessão inválida ou não autenticada."}

# Bearer token extraído do body → 200 em endpoint protegido
STATUS_COM_BEARER: 200

# Cookie literal da resposta de login
Set-Cookie: token=eyJ...; HttpOnly; Secure; SameSite=Strict; Path=/

# Body do login com accessToken presente
{"user":{...},"message":"Login realizado com sucesso","accessToken":"eyJ..."}

# Fail-loud sem JWT_SECRET/DATABASE_URL
❌ ERRO CRÍTICO DE CONFIGURAÇÃO — A aplicação não pode ser iniciada.
```

---

## Consequências

- **Imediatas:** Os 39 testes E2E e 267 testes unitários passam com exit code 0. O fluxo do browser continua usando exclusivamente cookie.
- **Invalidação de Sessões Existentes:** A migração de `localStorage` para cookies `httpOnly` invalida silenciosamente quaisquer sessões ativas previamente baseadas em localStorage. **Decisão:** Isso é aceitável para o ambiente de staging, visto que não há usuários finais reais impactados.
- **Futuras:** Integrações Android/Zebra podem usar `Authorization: Bearer <token>` extraído do body do login sem nenhuma configuração adicional no cliente.
- **Revisão obrigatória:** Se em algum momento o frontend passar a ler `accessToken` do body de login (mesmo que para "logar no console" ou "exibir no UI"), isso deve ser tratado como violação de segurança e revertido imediatamente.

---

## Referências

- [ADR-0008 — Decisões de Deploy Staging](./0008-decisoes-deploy-staging.md) — contexto da migração para cookie httpOnly
- [OWASP: HttpOnly Cookie Flag](https://owasp.org/www-community/HttpOnly)
- [RFC 6265 — HTTP State Management Mechanism](https://datatracker.ietf.org/doc/html/rfc6265)
- `src/infrastructure/security/jwt.strategy.ts` — implementação da estratégia dual
- `src/infrastructure/http/controllers/auth.controller.ts` — endpoint de login
