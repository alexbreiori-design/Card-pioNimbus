-- What's New: CMS no Super Admin + visualizações por loja

CREATE TABLE IF NOT EXISTS public.whats_new_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  media_path TEXT,
  media_type TEXT CHECK (media_type IS NULL OR media_type IN ('image', 'video')),
  cta_label TEXT,
  cta_href TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'disabled')),
  published_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whats_new_entries_status_published
  ON public.whats_new_entries (status, published_at DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS public.whats_new_store_views (
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES public.whats_new_entries(id) ON DELETE CASCADE,
  seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  seen_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (empresa_id, entry_id)
);

CREATE INDEX IF NOT EXISTS idx_whats_new_store_views_entry
  ON public.whats_new_store_views (entry_id);

ALTER TABLE public.whats_new_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whats_new_store_views ENABLE ROW LEVEL SECURITY;

-- Lojistas autenticados leem entradas publicadas (APIs usam service role; policies defensivas).
DROP POLICY IF EXISTS whats_new_entries_select_published ON public.whats_new_entries;
CREATE POLICY whats_new_entries_select_published ON public.whats_new_entries
  FOR SELECT
  TO authenticated
  USING (status = 'published');

DROP POLICY IF EXISTS whats_new_store_views_select_own ON public.whats_new_store_views;
CREATE POLICY whats_new_store_views_select_own ON public.whats_new_store_views
  FOR SELECT
  TO authenticated
  USING (usuario_pertence_empresa(empresa_id));

DROP POLICY IF EXISTS whats_new_store_views_insert_own ON public.whats_new_store_views;
CREATE POLICY whats_new_store_views_insert_own ON public.whats_new_store_views
  FOR INSERT
  TO authenticated
  WITH CHECK (usuario_pertence_empresa(empresa_id));

-- Bucket público para mídia das novidades (upload só via service role nas APIs SA)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'whats-new',
  'whats-new',
  true,
  20971520,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS whats_new_public_read ON storage.objects;
CREATE POLICY whats_new_public_read
  ON storage.objects FOR SELECT
  USING (bucket_id = 'whats-new');
