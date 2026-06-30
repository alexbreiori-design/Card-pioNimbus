-- Seed mínimo para ambiente STAGING (não rodar em produção).
-- 1) Crie o usuário em Authentication → Users (Auto Confirm).
-- 2) Troque SEU_USER_UUID pelo UUID do usuário (3 ocorrências).
-- 3) Ajuste o slug se quiser (padrão: loja-teste).

INSERT INTO empresas (slug, nome, cor_marca, telefone, endereco_cidade)
VALUES ('loja-teste', 'Loja Teste Staging', '#4e48dd', '(11) 90000-0000', 'São Paulo')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO perfis (id, nome)
SELECT 'SEU_USER_UUID'::uuid, 'Admin Staging'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = 'SEU_USER_UUID'::uuid)
ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, updated_at = now();

INSERT INTO empresa_membros (empresa_id, usuario_id, papel, ativo)
SELECT e.id, 'SEU_USER_UUID'::uuid, 'proprietario', true
FROM empresas e
WHERE e.slug = 'loja-teste'
ON CONFLICT (empresa_id, usuario_id) DO UPDATE
SET papel = EXCLUDED.papel, ativo = true;

-- Migration 018 removeu a coluna "data". Use store_config + catalog_modular_at.
INSERT INTO menu_store_state (slug, store_config, catalog_modular_at)
VALUES (
  'loja-teste',
  jsonb_build_object(
    'loja', jsonb_build_object(
      'nome', 'Loja Teste Staging',
      'slug', 'loja-teste'
    )
  ),
  now()
)
ON CONFLICT (slug) DO NOTHING;

-- Conferir:
SELECT slug, nome FROM empresas WHERE slug = 'loja-teste';
SELECT slug FROM menu_store_state WHERE slug = 'loja-teste';
