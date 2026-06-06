# Supabase — Cardápio Digital

## 1. Criar projeto

1. Acesse [supabase.com](https://supabase.com) e crie um projeto.
2. Em **Settings → API**, copie URL e `anon` key.

## 2. Variáveis de ambiente

Na raiz do projeto `cardapio-digital`, crie `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```

## 3. Executar o schema

1. Abra **SQL Editor** no Supabase.
2. Cole o conteúdo de `supabase/schema.sql`.
3. Execute (Run).
4. Em seguida, execute `supabase/migrations/001_prd_foundation.sql` (campos do PRD: PIX, geolocalização, promoções).

## 4. Criar primeiro usuário

1. **Authentication → Users → Add user** (e-mail + senha).
2. Copie o `user id` (UUID).

## 5. Seed da primeira empresa (exemplo)

Substitua `SEU_USER_ID` pelo UUID do passo 4:

```sql
INSERT INTO empresas (slug, nome, cor_marca, telefone, endereco_cidade)
VALUES ('nome-loja', 'Nome da Loja', '#8B2FC9', '(11) 98888-1234', 'São Paulo')
RETURNING id;

-- Use o id retornado:
INSERT INTO perfis (id, nome) VALUES ('6ca6c724-3462-463e-89ad-efee5a4d81ba', 'Administrador');

INSERT INTO empresa_membros (empresa_id, usuario_id, papel)
VALUES ('9f961ccc-08fc-47ab-8748-0821af80cdb9', '6ca6c724-3462-463e-89ad-efee5a4d81ba', 'proprietario');
```

## 6. Login no admin

- URL: `http://localhost:3010/login`
- Use o e-mail e senha criados no Auth.
- O painel carrega a loja vinculada em `empresa_membros` (não usa mais só o env).

## 7. Onboarding de operadores (multi-loja)

Para cada usuário admin:

1. **Authentication → Users** — criar conta (marque *Auto Confirm User*).
2. Executar `supabase/scripts/vincular_usuario_empresa.sql` (ajuste UUID/e-mail e slug).
3. Confirmar vínculo:

```sql
SELECT e.slug, u.email, em.papel
FROM empresa_membros em
JOIN empresas e ON e.id = em.empresa_id
JOIN auth.users u ON u.id = em.usuario_id;
```

Usuário **sem** linha em `empresa_membros` é redirecionado para `/admin/sem-acesso`. Se todas as lojas vinculadas estiverem **suspensas** (`empresas.suspensa`), o login leva a `/admin/loja-suspensa`.

Com **várias lojas**, o seletor "Loja ativa" aparece na sidebar; a escolha fica salva no navegador.

## 8. Migrations (ordem)

1. `schema.sql`
2. `migrations/001_prd_foundation.sql`
3. `migrations/002_zonas_entrega_publica.sql`
4. `migrations/003_supabase_first.sql`
5. `migrations/004_menu_store_state_rls.sql`
6. `migrations/005_public_store_catalog_rpc.sql`
7. `migrations/006_pedidos_arquivado.sql`
8. `migrations/007_storage_menu_assets.sql`
9. `migrations/008_empresa_segmento.sql`
10. `migrations/009_rls_audit_hardening.sql` — segurança Etapa 3 (RLS + RPC público + health_ping)
11. `migrations/010_super_admin_empresa_fields.sql` — métricas com consentimento + data go-live
12. `migrations/011_super_admin_notas.sql` — notas internas Nimbus por loja
13. `migrations/012_super_admin_system.sql` — suspensão de lojas, CRM (contrato/responsável) e perfil do sistema

## Tabelas principais

| Tabela | Uso |
|--------|-----|
| `empresas` | Loja (multi-tenant) |
| `empresa_membros` | Usuário ↔ loja |
| `categorias` / `produtos` | Cardápio |
| `grupo_adicionais` / `adicional_itens` | Opcionais |
| `pedidos` / `pedido_itens` | Pedidos |
| `clientes` | CRM |
| `zonas_entrega` | Taxa por região |
| `formas_pagamento` | Pagamentos ativos |

Cardápio público: `cor_marca` em `empresas` (customizável).  
Admin: identidade fixa Nimbus (CSS em `styles/admin.css`).

## Super-admin Nimbus

- URL: `/admin/sistema` (apenas e-mails em `NIMBUS_SUPER_ADMIN_EMAILS`).
- Migration `012`: suspensão de lojas, CRM, perfil (`nimbus_perfil_sistema`) e WhatsApp de suporte no admin dos lojistas.
- Domínio e rotas: `docs/DOMINIO.md`
