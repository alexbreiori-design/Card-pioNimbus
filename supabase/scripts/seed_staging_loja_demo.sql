-- Seed mínimo para ambiente STAGING (não rodar em produção).
-- 1) Crie o usuário em Authentication → Users (Auto Confirm).
-- 2) Substitua os placeholders abaixo pelo UUID do usuário.

-- INSERT INTO empresas (slug, nome, cor_marca, telefone, endereco_cidade)
-- VALUES ('loja-demo', 'Loja Demo Staging', '#4e48dd', '(11) 90000-0000', 'São Paulo')
-- ON CONFLICT (slug) DO NOTHING
-- RETURNING id;

-- INSERT INTO empresa_membros (empresa_id, usuario_id, papel, ativo)
-- SELECT e.id, 'SEU_USER_UUID'::uuid, 'proprietario', true
-- FROM empresas e
-- WHERE e.slug = 'loja-demo'
-- ON CONFLICT DO NOTHING;

-- Cardápio inicial (menu_store_state vazio — preencha pelo admin ou import):
-- INSERT INTO menu_store_state (slug, data)
-- VALUES ('loja-demo', '{}'::jsonb)
-- ON CONFLICT (slug) DO NOTHING;

-- Smoke:
-- SELECT slug, nome FROM empresas WHERE slug = 'loja-demo';
