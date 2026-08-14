<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Cardápio Nimbus — contexto para agentes

## Visão do produto

**Cardápio Nimbus** (`cardapionimbus.com.br`) é um cardápio digital multi-loja: clientes pedem online; lojistas operam pedidos, catálogo, entrega, caixa e integrações no admin; a equipe Nimbus gerencia lojas no super-admin (`/admin/sistema`).

## Stack e versões relevantes

| Peça | Versão / nota |
|------|----------------|
| Next.js | **16.2.6** (App Router; `reactCompiler: true` em `next.config.mjs`) |
| React / React DOM | **19.2.4** |
| Supabase | `@supabase/supabase-js` + `@supabase/ssr` (Auth, Postgres, RLS, Storage) |
| CSS | Tailwind 4 + folhas grandes em `styles/` (`admin.css`, cardápio, etc.) |
| Pagamentos | Mercado Pago, Asaas, PagBank (`lib/payments/`) |
| Mapas / entrega | Leaflet; LocationIQ + OpenRouteService (só server) |
| Linguagem | JS/JSX (sem TypeScript no app); alias `@/*` → raiz (`jsconfig.json`) |
| Testes automatizados | **Não há** script `test` no `package.json` — TODO / confirmar se entram no futuro |

## Estrutura de pastas (mapa curto)

| Caminho | Papel |
|---------|--------|
| `app/` | Rotas App Router: `(public)`, `(cardapio)`, `admin/*`, `api/*` |
| `proxy.js` | Roteamento por host/slug + sessão Supabase (equivalente de middleware neste Next) |
| `components/` | UI: `admin/`, `cardapio/`, `cardapio-v2/`, `super-admin` via `admin/super-admin/` |
| `lib/` | Domínio: `supabase/`, `orders/`, `payments/`, `delivery/`, `superAdmin/`, `catalog/`… |
| `context/`, `hooks/` | Estado cliente (ex.: `CardapioContext`) e hooks admin |
| `styles/` | CSS do admin, cardápio, tickets, landing |
| `supabase/` | `schema.sql`, `migrations/`, scripts de seed |
| `docs/` | Arquitetura, ambientes, domínio, ops, go-live |
| `scripts/` | Utilitários pontuais |

## Como rodar localmente

```bash
npm install
cp env.staging.example .env.local   # preferir Supabase de staging
npm run dev                         # http://localhost:3010
npm run lint
npm run build
npm start
```

Health: `curl -s http://localhost:3010/api/health/ready`

Ambientes e variáveis: [`STAGING.md`](./STAGING.md), [`docs/ENV.md`](./docs/ENV.md), [`docs/DOMINIO.md`](./docs/DOMINIO.md).

## Convenções do código

- **Arquivos / módulos:** inglês (`OrderLeftColumn.jsx`, `storeMetrics.js`).
- **UI / copy:** português (Brasil).
- **Multi-tenant:** quase tudo amarra em `empresas.slug` / `empresa_id`.
- **Pedidos:** `origem` tipicamente `cardapio_online` (público) ou `admin_manual` (balcão/admin).
- **Admin:** componentes em `components/admin/**`, estilos em `styles/admin.css` (e CSS modules pontuais no super-admin).
- **APIs:** Route Handlers em `app/api/**`; segredos e geocoding **só no servidor**.
- **Imports:** preferir `@/…` em relação a caminhos relativos longos.
- **Escopo de mudança:** mínimo necessário; não refatorar “de passagem”.

## Arquitetura / fluxos principais

- **Auth lojista:** Supabase Auth → vínculo em `empresa_membros` → `/admin/*` (sem membro → `/admin/sem-acesso`; loja suspensa → `/admin/loja-suspensa`).
- **Super-admin:** e-mails em `NIMBUS_SUPER_ADMIN_EMAILS` → `/admin/sistema`.
- **Cardápio público:** `/{slug}` (e v2 em `/{slug}/v2` quando habilitado); checkout via `context/CardapioContext` + `app/api/public-order*` / pagamentos.
- **Dados:** Postgres + RLS; catálogo evoluiu para tabelas modulares (ver migrations `016+`); storage `menu-assets`.
- **Entrega:** zonas, geocode, taxa (`/api/delivery-fee`), rotas/entregadores.
- Detalhe: [`docs/architecture.md`](./docs/architecture.md).

## O que NÃO mudar sem confirmação

- Schema / migrations Supabase em **produção** ou apontar Preview/local para Supabase de **produção**.
- Variáveis e chaves (`SUPABASE_SERVICE_ROLE_KEY`, `PAYMENTS_ENC_KEY`, webhooks, OAuth).
- Contratos públicos de pedido/pagamento/webhook sem pedido explícito.
- Domínio canônico / multi-tenant por slug (`docs/DOMINIO.md`).
- Deploy completo (**merge** em `staging`/`main`) **sem** comando `ship prev` / `ship prod` (ou equivalente explícito).
- Remover o aviso Next.js no topo deste arquivo.

## Decisões atuais importantes

Ver [`docs/decisions.md`](./docs/decisions.md). Em resumo: Next 16 + React Compiler; staging separado; pagamentos multi-provedor; métricas de loja no super-admin incluem canais (online vs balcão); ranking interno ainda focado em online (TODO / confirmar evolução).

## Deploy (comando do time)

| Comando do usuário | Ação do agente |
|--------------------|----------------|
| **ship prev** | commit + PR + **merge** só em `staging` (preview/homologação) |
| **ship prod** | commit + PR + merge em `main`; se ainda não estiver no prev, sobe **prev primeiro** e depois prod |

Sem um desses (ou pedido explícito equivalente), **não** fazer deploy completo. Detalhes de ambiente: [`STAGING.md`](./STAGING.md).

## Links para docs

| Doc | Conteúdo |
|-----|----------|
| [`docs/architecture.md`](./docs/architecture.md) | Visão técnica |
| [`docs/payments.md`](./docs/payments.md) | Pagamentos online (provedores, exclusividade, checkout, PagBank) |
| [`docs/decisions.md`](./docs/decisions.md) | ADRs curtos |
| [`docs/DOMINIO.md`](./docs/DOMINIO.md) | Rotas e domínio |
| [`docs/ENV.md`](./docs/ENV.md) | Variáveis |
| [`docs/OPS.md`](./docs/OPS.md) | Health / incidentes |
| [`docs/GO_LIVE.md`](./docs/GO_LIVE.md) | Go-live de loja |
| [`STAGING.md`](./STAGING.md) / [`docs/STAGING.md`](./docs/STAGING.md) | Ambientes |
| [`docs/CHECKLIST_IMPLEMENTAÇÕES_FUTURAS.md`](./docs/CHECKLIST_IMPLEMENTAÇÕES_FUTURAS.md) | Backlog vivo (WhatsApp API, segurança, etc.) |
| [`supabase/README.md`](./supabase/README.md) | Schema e migrations |

## TODOs de contexto faltante

- Confirmar provedor de pagamento **padrão** atual por loja (MP / Asaas / PagBank) e o que está deprecado.
- Confirmar se existe CI obrigatório no GitHub além do build Vercel.
- Inventário atualizado das migrations pós-`022` (há timestamps + Asaas/MP) vs lista do `supabase/README.md` (pode estar defasada).
- Política de UTMs / atribuição de tráfego: **ainda não existe** no pedido — só `origem` online vs admin.
- Alinhar duplicata `STAGING.md` (raiz) vs `docs/STAGING.md` (TODO / confirmar fonte canônica).
