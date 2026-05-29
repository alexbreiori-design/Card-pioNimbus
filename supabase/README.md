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
VALUES ('acai-da-nimbus', 'Açaí da Nimbus', '#8B2FC9', '(11) 98888-1234', 'São Paulo')
RETURNING id;

-- Use o id retornado:
INSERT INTO perfis (id, nome) VALUES ('6ca6c724-3462-463e-89ad-efee5a4d81ba', 'Administrador');

INSERT INTO empresa_membros (empresa_id, usuario_id, papel)
VALUES ('9f961ccc-08fc-47ab-8748-0821af80cdb9', '6ca6c724-3462-463e-89ad-efee5a4d81ba', 'proprietario');
```

## 6. Login no admin

- URL: `http://localhost:3000/admin/login`
- Use o e-mail e senha criados no Auth.

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
