# Briefing — novo agente (Cardápio Nimbus)

Execute **antes de implementar** qualquer tarefa. Não comece a codar até o passo 4.

## 1. Contexto fixo do repo

- Leia `AGENTS.md` na raiz.
- Respeite as rules em `.cursor/rules/` (inclui `obsidian-vault.mdc`, `project.mdc`).

## 2. Cofre Obsidian (memória de produto)

- MCP: `obsidian-nimbus` · path: `H:\Obsidian\Cardapio-Nimbus`
- Leia `00-Inicio.md`.
- Em seguida, abra só as notas do **tema da tarefa** (Produto, Domínios, Decisões/ADR, Ops, Ship, Visual).
- Se o MCP falhar, leia os arquivos direto no path acima.

## 3. Docs do repo (só se ainda faltar)

- `docs/architecture.md`
- `docs/decisions.md`

Não faça tour amplo de `app/` ou `components/` — isso vem depois, no escopo da tarefa.

## 4. Confirmação (obrigatória)

Responda em **5–8 linhas**, em português:

1. O que entendeu do produto (1–2 frases).
2. Restrições críticas (multi-tenant, ship, staging ≠ prod, sem commit/deploy sem pedido).
3. O que já viu no cofre relevante ao tema (ou “ainda sem tema”).
4. O que ainda é incerto (**TODO / confirmar**).

Depois diga: **Pronto — manda a tarefa.** Só então implemente o que o usuário pedir.

## 5. Depois de decisões importantes

Sugira o comando **`cofre sync`** (não atualize o vault sozinho). Sem senhas nem chaves; cofre fora do Git.
