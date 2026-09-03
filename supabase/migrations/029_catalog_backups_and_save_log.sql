-- Migration 029: backups diários do catálogo + log de saves (auditoria)
-- Append-only; escrita via service role (cron + API server).

CREATE TABLE IF NOT EXISTS public.store_catalog_daily_backups (
  slug TEXT NOT NULL REFERENCES public.empresas (slug) ON DELETE CASCADE,
  backup_date DATE NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (slug, backup_date)
);

CREATE INDEX IF NOT EXISTS store_catalog_daily_backups_date_idx
  ON public.store_catalog_daily_backups (backup_date);

CREATE TABLE IF NOT EXISTS public.store_catalog_save_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas (id) ON DELETE SET NULL,
  slug TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'unknown',
  actor_user_id UUID,
  actor_email TEXT,
  revision_before BIGINT,
  revision_after BIGINT,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS store_catalog_save_log_slug_created_idx
  ON public.store_catalog_save_log (slug, created_at DESC);

ALTER TABLE public.store_catalog_daily_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_catalog_save_log ENABLE ROW LEVEL SECURITY;
