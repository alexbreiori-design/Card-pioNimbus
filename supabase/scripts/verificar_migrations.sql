-- Fase 0.1 — Verificar se migrations 001–003 foram aplicadas no Supabase prod
-- Execute no SQL Editor e confira se todas as linhas retornam ok = true

SELECT
  to_regclass('public.empresas') IS NOT NULL AS empresas_ok,
  to_regclass('public.empresa_membros') IS NOT NULL AS empresa_membros_ok,
  to_regclass('public.menu_store_state') IS NOT NULL AS menu_store_state_ok,
  to_regclass('public.cupons') IS NOT NULL AS cupons_ok,
  to_regclass('public.pedidos') IS NOT NULL AS pedidos_ok,
  to_regclass('public.clientes') IS NOT NULL AS clientes_ok,
  to_regclass('public.zonas_entrega') IS NOT NULL AS zonas_entrega_ok;

-- Listar lojas ativas (Fase 0.3 — anote id + slug)
SELECT id, slug, nome, aberta, created_at
FROM public.empresas
ORDER BY created_at;

-- Conferir RLS ativo em menu_store_state
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'menu_store_state';

-- Policies atuais (antes da Fase 1)
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'menu_store_state';
