-- Migration 017: cupons normalizados (Fase 2b)
-- Execute no SQL Editor do Supabase após 016
-- Idempotente: cria a tabela cupons se a migration 003 nunca foi aplicada.

-- -----------------------------------------------------------------------------
-- Tabela cupons (inclui legacy_id para ids string do app)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.cupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas (id) ON DELETE CASCADE,
  legacy_id TEXT,
  codigo TEXT NOT NULL,
  tipo_desconto TEXT NOT NULL DEFAULT 'valor' CHECK (tipo_desconto IN ('valor', 'percentual')),
  valor_desconto NUMERIC(10, 2),
  percentual_desconto NUMERIC(5, 2),
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, codigo)
);

ALTER TABLE public.cupons
  ADD COLUMN IF NOT EXISTS legacy_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS cupons_empresa_legacy_id_unique
  ON public.cupons (empresa_id, legacy_id);

-- -----------------------------------------------------------------------------
-- RLS (reutiliza usuario_pertence_empresa do schema)
-- -----------------------------------------------------------------------------

ALTER TABLE public.cupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cupons_write_authenticated" ON public.cupons;
DROP POLICY IF EXISTS "cupons_select_public" ON public.cupons;
DROP POLICY IF EXISTS cupons_membro ON public.cupons;
DROP POLICY IF EXISTS cupons_select_loja_aberta ON public.cupons;

CREATE POLICY cupons_membro ON public.cupons
  FOR ALL TO authenticated
  USING (public.usuario_pertence_empresa(empresa_id))
  WITH CHECK (public.usuario_pertence_empresa(empresa_id));

CREATE POLICY cupons_select_loja_aberta ON public.cupons
  FOR SELECT TO anon, authenticated
  USING (
    ativo = true
    AND EXISTS (
      SELECT 1 FROM public.empresas e
      WHERE e.id = empresa_id AND e.aberta = true
    )
  );

-- -----------------------------------------------------------------------------
-- Backfill a partir do módulo promos (JSON legado)
-- -----------------------------------------------------------------------------

INSERT INTO public.cupons (
  empresa_id,
  legacy_id,
  codigo,
  tipo_desconto,
  valor_desconto,
  percentual_desconto,
  ativo,
  ordem
)
SELECT
  m.empresa_id,
  c->>'id',
  upper(trim(c->>'codigo')),
  CASE WHEN c->>'tipoDesconto' = 'percentual' THEN 'percentual' ELSE 'valor' END,
  CASE
    WHEN c->>'tipoDesconto' = 'percentual' THEN NULL
    ELSE COALESCE((c->>'valorDesconto')::numeric, 0)
  END,
  CASE
    WHEN c->>'tipoDesconto' = 'percentual' THEN COALESCE((c->>'percentualDesconto')::numeric, (c->>'valorDesconto')::numeric, 0)
    ELSE NULL
  END,
  COALESCE((c->>'ativo')::boolean, true),
  COALESCE((c->>'ordem')::int, 0)
FROM public.store_catalog_modules m
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(m.data->'cupons', '[]'::jsonb)) AS c
WHERE m.module = 'promos'
  AND c->>'id' IS NOT NULL
  AND NULLIF(trim(c->>'codigo'), '') IS NOT NULL
ON CONFLICT (empresa_id, legacy_id) DO UPDATE SET
  codigo = EXCLUDED.codigo,
  tipo_desconto = EXCLUDED.tipo_desconto,
  valor_desconto = EXCLUDED.valor_desconto,
  percentual_desconto = EXCLUDED.percentual_desconto,
  ativo = EXCLUDED.ativo,
  ordem = EXCLUDED.ordem,
  updated_at = now();

-- Fallback: cupons ainda em catalog_public / data legado (se existir)
INSERT INTO public.cupons (
  empresa_id,
  legacy_id,
  codigo,
  tipo_desconto,
  valor_desconto,
  percentual_desconto,
  ativo,
  ordem
)
SELECT
  e.id,
  c->>'id',
  upper(trim(c->>'codigo')),
  CASE WHEN c->>'tipoDesconto' = 'percentual' THEN 'percentual' ELSE 'valor' END,
  CASE
    WHEN c->>'tipoDesconto' = 'percentual' THEN NULL
    ELSE COALESCE((c->>'valorDesconto')::numeric, 0)
  END,
  CASE
    WHEN c->>'tipoDesconto' = 'percentual' THEN COALESCE((c->>'percentualDesconto')::numeric, (c->>'valorDesconto')::numeric, 0)
    ELSE NULL
  END,
  COALESCE((c->>'ativo')::boolean, true),
  COALESCE((c->>'ordem')::int, 0)
FROM public.menu_store_state ms
JOIN public.empresas e ON e.slug = ms.slug
CROSS JOIN LATERAL jsonb_array_elements(
  COALESCE(
    ms.data->'cupons',
    ms.catalog_public->'catalog'->'cupons',
    '[]'::jsonb
  )
) AS c
WHERE c->>'id' IS NOT NULL
  AND NULLIF(trim(c->>'codigo'), '') IS NOT NULL
ON CONFLICT (empresa_id, legacy_id) DO NOTHING;

-- Promos module: só promoções (cupons na tabela)
UPDATE public.store_catalog_modules
SET
  data = jsonb_build_object('promocoes', COALESCE(data->'promocoes', '[]'::jsonb)),
  updated_at = now()
WHERE module = 'promos';

-- Depreca JSON monolítico admin (coluna data fica vazia; fonte = tabelas modulares)
UPDATE public.menu_store_state
SET data = '{}'::jsonb
WHERE catalog_modular_at IS NOT NULL
  AND data IS DISTINCT FROM '{}'::jsonb;

-- Depois: POST /api/super-admin/rebuild-catalogs
