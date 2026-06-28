# Cardápio Nimbus

Cardápio digital multi-loja — pedidos online, painel admin e super-admin Nimbus.

**Domínio:** [cardapionimbus.com.br](https://cardapionimbus.com.br)

---

## Stack

- Next.js 16 (App Router)
- React 19
- Supabase (Auth, Postgres, RLS)

---

## Desenvolvimento local

```bash
npm install
npm run dev
```

App em **http://localhost:3010** (ver `package.json`).

Crie `.env.local` copiando `env.staging.example` para apontar ao **Supabase de staging** (recomendado). Mínimo:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_DEFAULT_STORE_SLUG=nome-loja
```

---

## Rotas principais

| URL | Uso |
|-----|-----|
| `/home` | Landing comercial (placeholder) |
| `/login` | Login lojistas |
| `/{slug}` | Cardápio público da loja |
| `/admin/pedidos` | Painel da loja |
| `/admin/sistema` | Super-admin Nimbus |

Detalhes: `docs/DOMINIO.md`

---

## Ambientes (staging / produção)

Guia completo: **[STAGING.md](./STAGING.md)**

Fluxo resumido: `local` → branch `feature/*` (Preview Vercel) → `staging` → `main` (produção).

---

## Documentação

| Arquivo | Conteúdo |
|---------|----------|
| `STAGING.md` | Local, staging, preview e produção |
| `env.staging.example` | Template `.env.local` para staging |
| `supabase/README.md` | Schema, migrations, onboarding |

---

## Migrations Supabase

Execute na ordem listada em `supabase/README.md` (até `012_super_admin_system.sql` para suspensão, CRM e perfil do sistema).

---

## Health

```bash
curl -s http://localhost:3010/api/health/ready
```
