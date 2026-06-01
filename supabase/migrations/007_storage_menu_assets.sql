-- Migration 007: bucket público para imagens do cardápio (Storage)
-- Upload via API autenticada; leitura pública para o cardápio online

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-assets',
  'menu-assets',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS menu_assets_public_read ON storage.objects;
CREATE POLICY menu_assets_public_read
  ON storage.objects FOR SELECT
  USING (bucket_id = 'menu-assets');

-- Meta leve para polling do catálogo (sem baixar JSON inteiro)
CREATE OR REPLACE FUNCTION public.get_public_store_catalog_meta(store_slug TEXT)
RETURNS TABLE(slug TEXT, updated_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.slug, m.updated_at
  FROM public.menu_store_state m
  WHERE m.slug = store_slug
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_store_catalog_meta(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_store_catalog_meta(TEXT) TO anon, authenticated;
