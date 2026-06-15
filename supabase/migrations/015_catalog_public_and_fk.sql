-- Migration 015: catálogo público enxuto + vínculo com empresas
-- Execute no SQL Editor do Supabase

ALTER TABLE public.menu_store_state
  ADD COLUMN IF NOT EXISTS catalog_public JSONB;

COMMENT ON COLUMN public.menu_store_state.catalog_public IS
  'Payload público pré-computado (loja + catálogo renderizado). Leitura anon via RPC.';

-- Remove órfãos antes do FK (seguro reexecutar)
DELETE FROM public.menu_store_state m
WHERE NOT EXISTS (
  SELECT 1 FROM public.empresas e WHERE e.slug = m.slug
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'menu_store_state_slug_fkey'
  ) THEN
    ALTER TABLE public.menu_store_state
      ADD CONSTRAINT menu_store_state_slug_fkey
      FOREIGN KEY (slug) REFERENCES public.empresas (slug) ON DELETE CASCADE;
  END IF;
END $$;

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
    COALESCE(
      m.catalog_public,
      (m.data - 'clientes' - 'pedidos')
        || jsonb_build_object('clientes', '[]'::jsonb, 'pedidos', '[]'::jsonb)
    ),
    m.updated_at
  FROM public.menu_store_state m
  WHERE m.slug = store_slug
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_store_catalog(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_store_catalog(TEXT) TO anon, authenticated;
