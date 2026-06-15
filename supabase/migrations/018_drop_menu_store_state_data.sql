-- Migration 018: remove coluna JSON legada menu_store_state.data
-- Execute no SQL Editor do Supabase após 017.

ALTER TABLE public.menu_store_state
  DROP COLUMN IF EXISTS data;

CREATE OR REPLACE FUNCTION public.get_public_store_catalog(store_slug TEXT)
RETURNS TABLE(slug TEXT, data JSONB, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT m.slug, m.catalog_public, m.updated_at
  FROM public.menu_store_state m
  WHERE m.slug = store_slug
    AND m.catalog_public IS NOT NULL
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_store_catalog(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_store_catalog(TEXT) TO anon, authenticated;
