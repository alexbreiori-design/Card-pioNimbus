-- Migration 005: leitura pública do catálogo via RPC (sem service_role no servidor)
-- Necessário após 004 — anon não lê menu_store_state diretamente
-- Execute no SQL Editor do Supabase

CREATE OR REPLACE FUNCTION public.get_public_store_catalog(store_slug TEXT)
RETURNS TABLE(slug TEXT, data JSONB, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.slug,
    (m.data - 'clientes' - 'pedidos')
      || jsonb_build_object('clientes', '[]'::jsonb, 'pedidos', '[]'::jsonb),
    m.updated_at
  FROM public.menu_store_state m
  WHERE m.slug = store_slug
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_store_catalog(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_store_catalog(TEXT) TO anon, authenticated;
