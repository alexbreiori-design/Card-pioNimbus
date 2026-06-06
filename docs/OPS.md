# Operações — Cardápio Nimbus

Guia enxuto para incidentes, saúde do sistema e checklist de segurança (Etapa 3).

---

## Health checks

| Endpoint | Uso | Auth |
|----------|-----|------|
| `GET /api/health/ready` | Uptime / deploy smoke (Supabase alcançável) | Público |
| `GET /api/health/config` | Diagnóstico de env (sem expor segredos) | Token `x-health-token` em produção |

**Smoke pós-deploy:**

```bash
curl -s https://SEU_DOMINIO/api/health/ready
# Esperado: {"ok":true,"supabase":true,"ts":"..."}
```

Requer migration `009_rls_audit_hardening.sql` (função `health_ping`).

---

## Se o sistema “cair”

1. **Vercel → Project → Deployments → último deploy → Functions / Runtime Logs**  
   Procure 5xx em `/api/public-order`, `/api/public-orders`, rotas admin.

2. **`GET /api/health/ready`**  
   - `503` + `missing_supabase_config` → variáveis na Vercel.  
   - `503` + `supabase_unreachable` → Supabase fora ou migration pendente.  
   - `503` + `supabase_empty` → banco sem empresas (improvável em produção).

3. **`GET /api/health/config`** (com `HEALTH_CONFIG_TOKEN`)  
   Confirma presença de URL/anon/service role/slug padrão.

4. **Supabase → Project → Logs**  
   Erros de RLS, timeout, conexão.

5. **Comunicação**  
   Avise o lojista pelo canal combinado (WhatsApp). Peça para não divulgar o link até normalizar.

6. **Rollback**  
   Vercel → Promote deployment anterior estável.

---

## Rate limit (S3-01)

Implementado em memória por instância (`lib/rateLimit.js`):

| Rota | Padrão |
|------|--------|
| `POST /api/public-order` | 8 req/min por IP; 40 req/min por slug |
| `GET /api/public-orders` | 30 req/min por IP; 60 req/min por slug |

Variáveis opcionais na Vercel:

- `PUBLIC_ORDER_RATE_LIMIT_MAX`
- `PUBLIC_ORDER_RATE_LIMIT_SLUG_MAX`
- `PUBLIC_ORDER_RATE_LIMIT_WINDOW_MS`
- `PUBLIC_ORDERS_READ_RATE_LIMIT_MAX`
- `PUBLIC_ORDERS_READ_RATE_LIMIT_SLUG_MAX`
- `PUBLIC_ORDERS_READ_RATE_LIMIT_WINDOW_MS`

Resposta abusiva: **HTTP 429** + header `Retry-After`.

> Em tráfego alto com várias instâncias serverless, considere Upstash Redis / Vercel KV para limite global.

---

## RLS — auditoria (S3-02)

Migration: `supabase/migrations/009_rls_audit_hardening.sql`

| Tabela / área | Situação esperada |
|---------------|-------------------|
| `pedidos`, `clientes`, `pedido_itens` | Apenas membros da loja (`*_membro`). Sem INSERT anon. |
| `menu_store_state` | Membros por slug (004). Público lê via `get_public_store_catalog`. |
| `empresas` | Membros leem/atualizam. **Sem** `SELECT` público amplo (009). |
| `cupons` | (Opcional — tabela da migration 003.) Escrita só membro; leitura pública só cupons ativos de loja aberta. O app hoje usa cupons no JSON de `menu_store_state`. |
| Checkout | `POST /api/public-order` usa **service role** no servidor. |

RPCs públicos (SECURITY DEFINER):

- `get_public_store_catalog`
- `get_public_empresa_cardapio`
- `get_first_open_empresa_slug`
- `health_ping`

**Validar no SQL Editor:**

```sql
-- Como anon não deve listar chave_pix de empresas abertas:
-- (teste com cliente anon no Supabase ou remova empresas_select_publica)
SELECT policyname FROM pg_policies WHERE tablename = 'empresas';
```

---

## Backup Supabase (S3-04)

1. Supabase Dashboard → **Settings → Database → Backups**.  
2. Confirme que o plano inclui backups automáticos (Pro recomendado para PITR).  
3. Anote data da última verificação: __________  
4. Link do painel: `https://supabase.com/dashboard/project/SEU_PROJECT/ref/settings/database`

Restauração: seguir documentação Supabase (Point-in-Time Recovery ou backup diário).

---

## Logs úteis

- **Vercel:** Functions, Edge, Build  
- **Supabase:** API, Postgres, Auth  
- **Browser (lojista):** Network ao salvar loja / receber pedido  

---

## Domínio e rotas

Domínio canônico: **cardapionimbus.com.br** (`NEXT_PUBLIC_SITE_URL`).

| Rota | Uso |
|------|-----|
| `/home` | Landing comercial |
| `/login` | Login lojistas |
| `/{slug}` | Cardápio público |
| `/admin/sistema` | Super-admin |

Detalhes: `docs/DOMINIO.md`

---

## Contatos

- Site: [cardapionimbus.com.br](https://cardapionimbus.com.br)  
- Variáveis de ambiente: `docs/ENV.md`
