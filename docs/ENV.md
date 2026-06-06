# Variáveis de ambiente — Vercel / local

Arquivo local: `.env.local` (não commitar).

---

## Obrigatórias

| Variável | Onde | Descrição |
|----------|------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Chave anon (pública, com RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Service role — checkout, APIs públicas no servidor |

---

## Recomendadas em produção

| Variável | Descrição |
|----------|-----------|
| `NEXT_PUBLIC_SITE_URL` | URL canônica (`https://cardapionimbus.com.br`) para metadata/OG |
| `NEXT_PUBLIC_DEFAULT_STORE_SLUG` | Slug padrão quando a raiz `/` redireciona |
| `HEALTH_CONFIG_TOKEN` | Protege `GET /api/health/config` em produção |

---

## Opcionais — produto

| Variável | Descrição |
|----------|-----------|
| `NEXT_PUBLIC_NIMBUS_SUPPORT_URL` | Fallback de suporte na sidebar admin se o WhatsApp do perfil não estiver configurado (padrão: cardapionimbus.com.br) |
| `NIMBUS_SUPER_ADMIN_EMAILS` | E-mails com acesso a `/admin/sistema` (vírgula). Padrão: `alexbreiori@gmail.com` |
| `NEXT_PUBLIC_ADMIN_NEW_ORDER_SOUND` | URL do som de pedido novo no admin |

---

## Opcionais — integrações

| Variável | Descrição |
|----------|-----------|
| `LOCATIONIQ_API_KEY` | Geocoding (CEP / endereço) |
| `OPENROUTESERVICE_API_KEY` | Rota / distância para taxa de entrega |

---

## Opcionais — rate limit (S3-01)

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `PUBLIC_ORDER_RATE_LIMIT_MAX` | `8` | Pedidos por IP por janela |
| `PUBLIC_ORDER_RATE_LIMIT_SLUG_MAX` | `40` | Pedidos por loja por janela |
| `PUBLIC_ORDER_RATE_LIMIT_WINDOW_MS` | `60000` | Janela em ms |
| `PUBLIC_ORDERS_READ_RATE_LIMIT_MAX` | `30` | Consultas “meus pedidos” por IP |
| `PUBLIC_ORDERS_READ_RATE_LIMIT_SLUG_MAX` | `60` | Consultas por loja |
| `PUBLIC_ORDERS_READ_RATE_LIMIT_WINDOW_MS` | `60000` | Janela em ms |

---

## Vercel — checklist deploy

1. Settings → Environment Variables → Production (+ Preview se quiser paridade).  
2. Nunca expor `SUPABASE_SERVICE_ROLE_KEY` em variável `NEXT_PUBLIC_*`.  
3. Após alterar env: **Redeploy** (env não atualiza deploy antigo).  
4. Smoke: `GET /api/health/ready` e login admin.

---

## Local

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_DEFAULT_STORE_SLUG=minha-loja
```

Dev: `npm run dev` (porta 3010).

---

## Domínio e rotas

Domínio oficial: **cardapionimbus.com.br**

| Rota | Descrição |
|------|-----------|
| `/home` | Landing comercial |
| `/login` | Login lojistas |
| `/{slug}` | Cardápio da loja |
| `/admin/sistema` | Super-admin Nimbus |

Mapa completo: `docs/DOMINIO.md`
