# Ambientes — local, staging, preview e produção

Guia para desenvolver e testar **sem afetar clientes reais** em `cardapionimbus.com.br`.

---

## Visão geral

| Camada | URL | Branch Git | Supabase | Quem acessa |
|--------|-----|------------|----------|-------------|
| **Local** | `http://localhost:3010` | qualquer | Staging | Você |
| **Preview** | `*.vercel.app` (automático) | `feature/*` | Staging | Você / equipe |
| **Staging** | `https://staging.cardapionimbus.com.br` | `staging` | Staging | Você / homologação |
| **Produção** | `https://cardapionimbus.com.br` | `main` | Production | Clientes |

**Regra de ouro:** nunca aponte Preview ou local para o Supabase de produção enquanto estiver testando código novo.

---

## Parte 1 — Supabase staging (banco separado)

### 1.1 Criar projeto

1. [supabase.com](https://supabase.com) → **New project** (ex.: `cardapio-nimbus-staging`).
2. Anote **URL**, **anon key** e **service role key**.

### 1.2 Aplicar schema (ordem obrigatória)

A migration `001` **não cria** as tabelas — ela só adiciona colunas em `empresas`, `pedidos`, etc.  
Se rodar `001` antes do base, aparece: `relation "empresas" does not exist`.

**Passo a passo no SQL Editor do projeto staging:**

1. **`supabase/schema.sql`** — execute o arquivo **inteiro** primeiro (cria `empresas`, `pedidos`, RLS base, etc.)
2. **`supabase/migrations/001_prd_foundation.sql`**
3. **`002`** … até **`022`** — uma por vez, na ordem numérica

Confira também `supabase/README.md`.

> Se alguma migration falhar com “already exists”, leia a mensagem: muitas são idempotentes (`IF NOT EXISTS`). Só avance quando a anterior terminou com sucesso.

### 1.2b Duplicar o projeto de produção?

O Supabase **não tem** botão “duplicar projeto” no plano gratuito. Opções:

| Abordagem | Quando usar | Dados reais de clientes? |
|-----------|-------------|---------------------------|
| **A — Schema do zero** (schema.sql + 001–022) | **Recomendado para staging** | Não — só loja demo |
| **B — Backup/restore** (plano pago) | Clonar prod inteiro | Sim — cuidado com LGPD |
| **C — `pg_dump` / `pg_restore`** | Quem já usa CLI/Postgres | Opcional (só schema ou schema+dados) |

Para staging com clientes reais em produção, prefira **A**: mesma estrutura, **banco vazio** + `loja-demo`. Assim pedidos de teste nunca misturam com dados reais.

Se no futuro precisar copiar **só o cardápio** de uma loja, use no super-admin: export/import de catálogo ou backup JSON da loja — não clone o banco inteiro.

### 1.3 Usuário e loja demo

1. **Authentication → Users** → criar usuário de teste (Auto Confirm).
2. Ajuste e execute `supabase/scripts/seed_staging_loja_demo.sql` com o UUID do usuário.
3. Slug sugerido: **`loja-demo`**.

---

## Parte 2 — Variáveis na Vercel

**Project → Settings → Environment Variables**

### Production (branch `main` apenas)

| Variável | Valor |
|----------|--------|
| `NEXT_PUBLIC_NIMBUS_APP_ENV` | `production` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do Supabase **produção** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon **produção** |
| `SUPABASE_SERVICE_ROLE_KEY` | service role **produção** |
| `NEXT_PUBLIC_SITE_URL` | `https://cardapionimbus.com.br` |
| `NEXT_PUBLIC_ROOT_DOMAIN` | `cardapionimbus.com.br` |
| `NEXT_PUBLIC_DEFAULT_STORE_SLUG` | slug real ou padrão |

### Preview (branches que não são produção)

| Variável | Valor |
|----------|--------|
| `NEXT_PUBLIC_NIMBUS_APP_ENV` | `preview` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do Supabase **staging** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon **staging** |
| `SUPABASE_SERVICE_ROLE_KEY` | service role **staging** |
| `NEXT_PUBLIC_SITE_URL` | `https://staging.cardapionimbus.com.br` |
| `NEXT_PUBLIC_ROOT_DOMAIN` | *(vazio)* |
| `NEXT_PUBLIC_DEFAULT_STORE_SLUG` | `loja-demo` |

> **Por que `NEXT_PUBLIC_ROOT_DOMAIN` vazio no staging?**  
> Evita links `loja.cardapionimbus.com.br` (produção). No staging use `staging.cardapionimbus.com.br/loja-demo`.

### Local (`.env.local`)

```bash
cp env.staging.example .env.local
# preencha as chaves do Supabase staging
```

---

## Parte 3 — Vercel: branch staging + domínio

### 3.1 Branch `staging`

```bash
git checkout main && git pull
git checkout -b staging
git push -u origin staging
```

### 3.2 Domínio

1. Vercel → **Settings → Domains** → `staging.cardapionimbus.com.br`
2. Associe à branch **`staging`**.

### 3.3 DNS

| Tipo | Nome | Valor |
|------|------|--------|
| CNAME | `staging` | valor indicado pela Vercel |

### 3.4 Smoke test

```bash
curl -s https://staging.cardapionimbus.com.br/api/health/ready
```

Deve aparecer faixa **“Ambiente de testes”** no admin e cardápio.

---

## Parte 4 — Proteger produção (GitHub)

**Settings → Branches → `main`:**

- Require pull request before merging
- (opcional) Require CI `build`

---

## Parte 5 — Fluxo do dia a dia

```bash
git checkout staging && git pull
git checkout -b feature/minha-melhoria
npm run dev
# commit + push → Preview Vercel automático
# PR → staging → homologar em staging.cardapionimbus.com.br
# PR staging → main → produção
```

---

## Parte 6 — Banner de ambiente

Controlado por `NEXT_PUBLIC_NIMBUS_APP_ENV`:

| Valor | Banner |
|-------|--------|
| `production` | oculto |
| `staging` / `preview` / `local` | faixa visível no topo |

Código: `lib/runtimeEnvironment.js`, `components/shared/EnvironmentBanner.jsx`.

---

## Checklist

- [ ] Supabase staging + migrations
- [ ] Loja `loja-demo` + usuário teste
- [ ] Vercel Production = Supabase prod
- [ ] Vercel Preview = Supabase staging
- [ ] Domínio staging → branch `staging`
- [ ] `.env.local` → staging
- [ ] Proteção da branch `main`
