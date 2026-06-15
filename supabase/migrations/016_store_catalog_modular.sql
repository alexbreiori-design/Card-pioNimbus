-- Migration 016: catálogo modular (Fase 2)
-- Separa categorias/produtos/adicionais em tabelas + módulos JSON (pizza, marmita, promos)
-- Execute no SQL Editor do Supabase após 015

ALTER TABLE public.menu_store_state
  ADD COLUMN IF NOT EXISTS store_config JSONB,
  ADD COLUMN IF NOT EXISTS catalog_modular_at TIMESTAMPTZ;

COMMENT ON COLUMN public.menu_store_state.store_config IS
  'Config da loja (loja, _meta, clientes) — fora do catálogo modular.';
COMMENT ON COLUMN public.menu_store_state.catalog_modular_at IS
  'Quando o catálogo foi migrado para tabelas modulares.';

-- -----------------------------------------------------------------------------
-- Tabelas modulares
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.store_catalog_categorias (
  empresa_id UUID NOT NULL REFERENCES public.empresas (id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  nome TEXT NOT NULL,
  icone TEXT NOT NULL DEFAULT 'burger',
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa_id, id)
);

CREATE INDEX IF NOT EXISTS idx_store_catalog_categorias_ordem
  ON public.store_catalog_categorias (empresa_id, ordem);

CREATE TABLE IF NOT EXISTS public.store_catalog_produtos (
  empresa_id UUID NOT NULL REFERENCES public.empresas (id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  categoria_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  preco NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (preco >= 0),
  imagem_url TEXT NOT NULL DEFAULT '',
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  tipo TEXT NOT NULL DEFAULT 'comum',
  extra JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa_id, id)
);

CREATE INDEX IF NOT EXISTS idx_store_catalog_produtos_cat
  ON public.store_catalog_produtos (empresa_id, categoria_id, ordem);

CREATE TABLE IF NOT EXISTS public.store_catalog_addon_categories (
  empresa_id UUID NOT NULL REFERENCES public.empresas (id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  nome TEXT NOT NULL,
  tipo_selecao TEXT NOT NULL DEFAULT 'multipla',
  min INT NOT NULL DEFAULT 0,
  max INT NOT NULL DEFAULT 99,
  obrigatorio BOOLEAN NOT NULL DEFAULT false,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  extra JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa_id, id)
);

CREATE INDEX IF NOT EXISTS idx_store_catalog_addon_categories_ordem
  ON public.store_catalog_addon_categories (empresa_id, ordem);

CREATE TABLE IF NOT EXISTS public.store_catalog_addon_items (
  empresa_id UUID NOT NULL REFERENCES public.empresas (id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  categoria_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  preco NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (preco >= 0),
  imagem_url TEXT NOT NULL DEFAULT '',
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  extra JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa_id, id)
);

CREATE INDEX IF NOT EXISTS idx_store_catalog_addon_items_cat
  ON public.store_catalog_addon_items (empresa_id, categoria_id, ordem);

CREATE TABLE IF NOT EXISTS public.store_catalog_modules (
  empresa_id UUID NOT NULL REFERENCES public.empresas (id) ON DELETE CASCADE,
  module TEXT NOT NULL CHECK (module IN ('pizza', 'marmita', 'promos')),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa_id, module)
);

-- -----------------------------------------------------------------------------
-- RLS — membros da empresa (reutiliza usuario_pertence_empresa já criada no schema)
-- -----------------------------------------------------------------------------

ALTER TABLE public.store_catalog_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_catalog_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_catalog_addon_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_catalog_addon_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_catalog_modules ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'store_catalog_categorias',
    'store_catalog_produtos',
    'store_catalog_addon_categories',
    'store_catalog_addon_items',
    'store_catalog_modules'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_membro', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated
       USING (public.usuario_pertence_empresa(empresa_id))
       WITH CHECK (public.usuario_pertence_empresa(empresa_id))',
      t || '_membro',
      t
    );
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- Backfill a partir de menu_store_state.data (JSON legado)
-- -----------------------------------------------------------------------------

UPDATE public.menu_store_state m
SET store_config = jsonb_build_object(
  'loja', COALESCE(m.data->'loja', '{}'::jsonb),
  '_meta', COALESCE(m.data->'_meta', '{}'::jsonb),
  'clientes', COALESCE(m.data->'clientes', '[]'::jsonb)
)
WHERE m.store_config IS NULL
  AND m.data IS NOT NULL;

INSERT INTO public.store_catalog_categorias (empresa_id, id, nome, icone, ordem, ativo)
SELECT
  e.id,
  c->>'id',
  COALESCE(NULLIF(trim(c->>'nome'), ''), 'Sem nome'),
  COALESCE(c->>'icone', 'burger'),
  COALESCE((c->>'ordem')::int, 0),
  COALESCE((c->>'ativo')::boolean, true)
FROM public.menu_store_state m
JOIN public.empresas e ON e.slug = m.slug
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(m.data->'categorias', '[]'::jsonb)) AS c
WHERE c->>'id' IS NOT NULL
ON CONFLICT (empresa_id, id) DO UPDATE SET
  nome = EXCLUDED.nome,
  icone = EXCLUDED.icone,
  ordem = EXCLUDED.ordem,
  ativo = EXCLUDED.ativo,
  updated_at = now();

INSERT INTO public.store_catalog_produtos (
  empresa_id, id, categoria_id, nome, descricao, preco, imagem_url, ordem, ativo, tipo, extra
)
SELECT
  e.id,
  p->>'id',
  COALESCE(p->>'categoriaId', ''),
  COALESCE(NULLIF(trim(p->>'nome'), ''), 'Sem nome'),
  COALESCE(p->>'descricao', ''),
  COALESCE((p->>'preco')::numeric, 0),
  COALESCE(p->>'imagemUrl', ''),
  COALESCE((p->>'ordem')::int, 0),
  COALESCE((p->>'ativo')::boolean, true),
  COALESCE(p->>'tipo', 'comum'),
  COALESCE(
    (p - 'id' - 'categoriaId' - 'nome' - 'descricao' - 'preco' - 'imagemUrl' - 'ordem' - 'ativo' - 'tipo'),
    '{}'::jsonb
  )
FROM public.menu_store_state m
JOIN public.empresas e ON e.slug = m.slug
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(m.data->'produtos', '[]'::jsonb)) AS p
WHERE p->>'id' IS NOT NULL
ON CONFLICT (empresa_id, id) DO UPDATE SET
  categoria_id = EXCLUDED.categoria_id,
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  preco = EXCLUDED.preco,
  imagem_url = EXCLUDED.imagem_url,
  ordem = EXCLUDED.ordem,
  ativo = EXCLUDED.ativo,
  tipo = EXCLUDED.tipo,
  extra = EXCLUDED.extra,
  updated_at = now();

INSERT INTO public.store_catalog_addon_categories (
  empresa_id, id, nome, tipo_selecao, min, max, obrigatorio, ordem, ativo, extra
)
SELECT
  e.id,
  c->>'id',
  COALESCE(NULLIF(trim(c->>'nome'), ''), 'Adicionais'),
  COALESCE(c->>'tipoSelecao', 'multipla'),
  COALESCE((c->>'min')::int, 0),
  COALESCE((c->>'max')::int, 99),
  COALESCE((c->>'obrigatorio')::boolean, false),
  COALESCE((c->>'ordem')::int, 0),
  COALESCE((c->>'ativo')::boolean, true),
  COALESCE(
    (c - 'id' - 'nome' - 'tipoSelecao' - 'min' - 'max' - 'obrigatorio' - 'ordem' - 'ativo'),
    '{}'::jsonb
  )
FROM public.menu_store_state m
JOIN public.empresas e ON e.slug = m.slug
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(m.data->'adicionaisCategorias', '[]'::jsonb)) AS c
WHERE c->>'id' IS NOT NULL
ON CONFLICT (empresa_id, id) DO UPDATE SET
  nome = EXCLUDED.nome,
  tipo_selecao = EXCLUDED.tipo_selecao,
  min = EXCLUDED.min,
  max = EXCLUDED.max,
  obrigatorio = EXCLUDED.obrigatorio,
  ordem = EXCLUDED.ordem,
  ativo = EXCLUDED.ativo,
  extra = EXCLUDED.extra,
  updated_at = now();

INSERT INTO public.store_catalog_addon_items (
  empresa_id, id, categoria_id, nome, descricao, preco, imagem_url, ordem, ativo, extra
)
SELECT
  e.id,
  i->>'id',
  COALESCE(i->>'categoriaId', ''),
  COALESCE(NULLIF(trim(i->>'nome'), ''), 'Item'),
  COALESCE(i->>'descricao', ''),
  COALESCE((i->>'preco')::numeric, 0),
  COALESCE(i->>'imagemUrl', ''),
  COALESCE((i->>'ordem')::int, 0),
  COALESCE((i->>'ativo')::boolean, true),
  COALESCE(
    (i - 'id' - 'categoriaId' - 'nome' - 'descricao' - 'preco' - 'imagemUrl' - 'ordem' - 'ativo'),
    '{}'::jsonb
  )
FROM public.menu_store_state m
JOIN public.empresas e ON e.slug = m.slug
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(m.data->'adicionaisItens', '[]'::jsonb)) AS i
WHERE i->>'id' IS NOT NULL
ON CONFLICT (empresa_id, id) DO UPDATE SET
  categoria_id = EXCLUDED.categoria_id,
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  preco = EXCLUDED.preco,
  imagem_url = EXCLUDED.imagem_url,
  ordem = EXCLUDED.ordem,
  ativo = EXCLUDED.ativo,
  extra = EXCLUDED.extra,
  updated_at = now();

INSERT INTO public.store_catalog_modules (empresa_id, module, data)
SELECT e.id, 'pizza', jsonb_build_object(
  'pizzaCardapio', COALESCE(m.data->'pizzaCardapio', '{}'::jsonb),
  'pizzas', COALESCE(m.data->'pizzas', '[]'::jsonb)
)
FROM public.menu_store_state m
JOIN public.empresas e ON e.slug = m.slug
ON CONFLICT (empresa_id, module) DO UPDATE SET
  data = EXCLUDED.data,
  updated_at = now();

INSERT INTO public.store_catalog_modules (empresa_id, module, data)
SELECT e.id, 'marmita', jsonb_build_object(
  'marmitas', COALESCE(m.data->'marmitas', '[]'::jsonb),
  'marmitaGrupos', COALESCE(m.data->'marmitaGrupos', '[]'::jsonb),
  'marmitaCardapio', COALESCE(m.data->'marmitaCardapio', '{}'::jsonb)
)
FROM public.menu_store_state m
JOIN public.empresas e ON e.slug = m.slug
ON CONFLICT (empresa_id, module) DO UPDATE SET
  data = EXCLUDED.data,
  updated_at = now();

INSERT INTO public.store_catalog_modules (empresa_id, module, data)
SELECT e.id, 'promos', jsonb_build_object(
  'promocoes', COALESCE(m.data->'promocoes', '[]'::jsonb),
  'cupons', COALESCE(m.data->'cupons', '[]'::jsonb)
)
FROM public.menu_store_state m
JOIN public.empresas e ON e.slug = m.slug
ON CONFLICT (empresa_id, module) DO UPDATE SET
  data = EXCLUDED.data,
  updated_at = now();

UPDATE public.menu_store_state
SET catalog_modular_at = now()
WHERE catalog_modular_at IS NULL
  AND store_config IS NOT NULL;

-- Após rodar: chame POST /api/super-admin/rebuild-catalogs para gerar catalog_public
