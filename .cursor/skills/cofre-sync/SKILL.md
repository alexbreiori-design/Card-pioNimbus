---
name: cofre-sync
description: >-
  Atualiza o cofre Obsidian do Cardápio Nimbus (fora do Git) com decisões e
  contexto da conversa. Usar quando o usuário disser cofre sync, vault sync,
  atualiza o cofre, ou equivalente explícito.
---

# Cofre sync

**Executar** somente quando o usuário disser `cofre sync`, `vault sync`, “atualiza o cofre”, ou equivalente explícito.

**Sugerir** (sem executar) quando a conversa tiver conteúdo novo digno de cofre e o usuário ainda não pediu sync — ver rule `obsidian-vault.mdc`.

MCP: **`obsidian-nimbus`** · path: `H:\Obsidian\Cardapio-Nimbus`  
Se o MCP falhar: editar/criar `.md` direto nesse path.

## O que fazer

1. Extrair da conversa (e do diff recente, se relevante) o que **mudou de verdade**:
   - decisão de produto / comportamento
   - ADR (regra que não deve se perder)
   - ops / go-live / instalador / impressão
   - ship feito (prev/prod + PRs)
   - item de backlog resolvido ou novo
2. Ler `00-Inicio.md` e as notas do tema já existentes (não duplicar).
3. Atualizar a nota certa **ou** criar nota nova no folder certo + link a partir do índice da área / `ADR-indice` / `Backlog-vivo` / `05-Ship`.
4. Estilo: curto, factual, português; wikilinks `[[Nota]]` quando fizer sentido.
5. Ao terminar: listar arquivos criados/editados em 3–6 bullets. Sem enrolação.

## Onde colocar

| Tipo | Pasta |
|------|--------|
| Ideia solta / ainda não classificada | `00-Inbox` |
| Produto / fluxo / preferência | `01-Produto` |
| Superfície (admin, cardápio…) | `02-Superficies` |
| Domínio (pedidos, pagamento…) | `03-Dominios` |
| Ops / ambientes / instalador | `06-Ops` (e `03-Ops` se a nota já existir lá) |
| Visual / comanda | `05-Visual` |
| Ship / release | `05-Ship` |
| ADR / decisão | `07-Decisoes` + link em `ADR-indice` |
| Segurança | `08-Seguranca` |
| Backlog | `09-Backlog` |

## Regras

- **Nunca** colocar senhas, tokens, service role, `PAYMENTS_ENC_KEY`, webhooks secretos, `.env`.
- **Nunca** commit/push do vault no Git do Cardápio Nimbus (cofre é fora do repo).
- Não reescrever o vault inteiro — só o que a conversa justificou.
- Se não houver nada novo para documentar: dizer isso e não criar nota vazia.
- Conflito com código/`AGENTS.md`: documentar o fato + marcar **TODO / confirmar**.

## Não fazer neste skill

- Não rodar `ship prev` / `ship prod`.
- Não criar markdown de docs dentro do Git só por causa do sync.
- Não “organizar o cofre todo” sem pedido explícito.
