# Diretrizes de Testes E2E

Esta pasta contém todos os testes de ponta-a-ponta (E2E) do módulo Backend do SGE.

## ⚠️ Regras Cruciais (LINT / Checklist)

### 1. Limpeza de Estado (Self-Cleaning)
**Toda suíte E2E DEVE limpar os dados que cria no banco de dados.**
No bloco `afterAll` de cada arquivo, você deve remover as entidades que foram criadas no `beforeAll` ou dentro dos testes (`it`).
- **Atenção:** Siga a ordem correta das Chaves Estrangeiras (FKs) na hora de deletar. Exemplo: exclua `ContagemInventario`, depois `AjusteEstoque`, depois `Movimentacao`, depois `Lote`, etc.

### 2. Contaminação do ChainPointer (BUG-007)
**O Problema:** No passado, suítes que manipulavam `Movimentacao` ou `LogCusto` limpavam essas tabelas no `afterAll`, mas esqueciam de limpar a tabela `ChainPointer`. Como resultado, a suíte de auditoria (`chain-pointer.concurrency.e2e-spec.ts`) acusava corrupção de hash na cadeia, pois lia um ponteiro fantasma.
**A Solução (Automática):** Nós configuramos um hook global no Jest (`setup-e2e.ts`) que limpa automaticamente a tabela `ChainPointer` após o término de **cada suíte de testes**.
- Portanto, você **não precisa mais** se preocupar em deletar o `ChainPointer` manualmente no seu `afterAll`. O Jest cuidará disso!

### 3. Rodando os testes
Para rodar a suíte E2E:
```bash
npm run test:e2e
```
Isso acionará o script `scripts/run-e2e.ts`, que sobe um container Docker efêmero, aplica migrations, roda o seed e executa o Jest, destruindo o container no final.
