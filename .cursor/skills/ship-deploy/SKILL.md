---
name: ship-deploy
description: Executa o fluxo ship prev (staging) ou ship prod (main) deste repo — commit, PR e merge conforme o comando do usuário.
---

# Ship prev / ship prod

Usar **somente** quando o usuário disser `ship prev`, `ship prod`, ou equivalente explícito (“sobe pro staging”, “vai pra produção” no sentido deste fluxo).

## ship prev

1. `git status` / `git diff` / `git log` — entender o que entra.
2. Commit (mensagem no estilo do repo; só se houver mudanças).
3. Push da branch de feature.
4. Abrir PR com base **`staging`** (não `main`).
5. Merge do PR em `staging` (via `gh` após checks ok, ou como o usuário pedir).
6. Não mergear em `main`.

## ship prod

1. Se as mudanças **ainda não** estão em `staging`, executar o equivalente a **ship prev** primeiro.
2. Em seguida: PR (ou promoção) com destino **`main`** e merge.
3. Não forçar push em `main`/`master`.

## Regras

- Sem `ship prev` / `ship prod` (ou pedido explícito): **não** fazer deploy completo.
- Nunca `--force` em main; nunca pular hooks sem pedido.
- Seguir `STAGING.md`: Preview/staging ≠ Supabase de produção.
- Ao terminar, informar URLs do PR e branch de destino.

## Não fazer neste skill

- Não aplicar migrations em produção.
- Não rotacionar secrets.
- Não criar docs extras só por causa do ship.
