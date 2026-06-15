-- Migration 019: pizza e marmita em tabelas normalizadas
-- Execute no SQL Editor do Supabase após 018.

-- -----------------------------------------------------------------------------
-- Pizza
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.store_pizza_tamanhos (
  empresa_id UUID NOT NULL REFERENCES public.empresas (id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  nome TEXT NOT NULL,
  descricao_fatias TEXT NOT NULL DEFAULT '',
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa_id, id)
);

CREATE INDEX IF NOT EXISTS idx_store_pizza_tamanhos_ordem
  ON public.store_pizza_tamanhos (empresa_id, ordem);

CREATE TABLE IF NOT EXISTS public.store_pizza_sabores (
  empresa_id UUID NOT NULL REFERENCES public.empresas (id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  imagem_url TEXT NOT NULL DEFAULT '',
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  extra JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa_id, id)
);

CREATE INDEX IF NOT EXISTS idx_store_pizza_sabores_ordem
  ON public.store_pizza_sabores (empresa_id, ordem);

CREATE TABLE IF NOT EXISTS public.store_pizza_categorias (
  empresa_id UUID NOT NULL REFERENCES public.empresas (id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  nome_publico TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  imagem_url TEXT NOT NULL DEFAULT '',
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  extra JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa_id, id)
);

CREATE INDEX IF NOT EXISTS idx_store_pizza_categorias_ordem
  ON public.store_pizza_categorias (empresa_id, ordem);

-- -----------------------------------------------------------------------------
-- Marmita
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.store_marmita_grupos (
  empresa_id UUID NOT NULL REFERENCES public.empresas (id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  nome TEXT NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  extra JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa_id, id)
);

CREATE INDEX IF NOT EXISTS idx_store_marmita_grupos_ordem
  ON public.store_marmita_grupos (empresa_id, ordem);

CREATE TABLE IF NOT EXISTS public.store_marmitas (
  empresa_id UUID NOT NULL REFERENCES public.empresas (id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  tag_admin TEXT NOT NULL DEFAULT '',
  nome_publico TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  imagem_url TEXT NOT NULL DEFAULT '',
  categoria_id TEXT NOT NULL DEFAULT '',
  grupo_id TEXT NOT NULL DEFAULT '',
  dia_semana TEXT NOT NULL DEFAULT '',
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  extra JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa_id, id)
);

CREATE INDEX IF NOT EXISTS idx_store_marmitas_ordem
  ON public.store_marmitas (empresa_id, ordem);

CREATE TABLE IF NOT EXISTS public.store_marmita_settings (
  empresa_id UUID PRIMARY KEY REFERENCES public.empresas (id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

ALTER TABLE public.store_pizza_tamanhos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_pizza_sabores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_pizza_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_marmita_grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_marmitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_marmita_settings ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'store_pizza_tamanhos',
    'store_pizza_sabores',
    'store_pizza_categorias',
    'store_marmita_grupos',
    'store_marmitas',
    'store_marmita_settings'
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
-- Backfill a partir de store_catalog_modules (pizza / marmita)
-- -----------------------------------------------------------------------------

INSERT INTO public.store_pizza_tamanhos (empresa_id, id, nome, descricao_fatias, ordem, ativo)
SELECT
  mod.empresa_id,
  COALESCE(NULLIF(t->>'id', ''), gen_random_uuid()::text),
  COALESCE(NULLIF(t->>'nome', ''), 'Tamanho'),
  COALESCE(t->>'descricaoFatias', ''),
  COALESCE((t->>'ordem')::int, 0),
  COALESCE((t->>'ativo')::boolean, true)
FROM public.store_catalog_modules mod
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(mod.data->'pizzaCardapio'->'tamanhos', '[]'::jsonb)) AS t
WHERE mod.module = 'pizza'
ON CONFLICT (empresa_id, id) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao_fatias = EXCLUDED.descricao_fatias,
  ordem = EXCLUDED.ordem,
  ativo = EXCLUDED.ativo,
  updated_at = now();

INSERT INTO public.store_pizza_sabores (empresa_id, id, nome, descricao, imagem_url, ordem, ativo, extra)
SELECT
  mod.empresa_id,
  COALESCE(NULLIF(s->>'id', ''), gen_random_uuid()::text),
  COALESCE(NULLIF(s->>'nome', ''), 'Sabor'),
  COALESCE(s->>'descricao', ''),
  COALESCE(s->>'imagemUrl', ''),
  COALESCE((s->>'ordem')::int, 0),
  COALESCE((s->>'ativo')::boolean, true),
  jsonb_build_object(
    'tamanhoIds', COALESCE(s->'tamanhoIds', '[]'::jsonb),
    'precos', COALESCE(s->'precos', '{}'::jsonb)
  )
FROM public.store_catalog_modules mod
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(mod.data->'pizzaCardapio'->'sabores', '[]'::jsonb)) AS s
WHERE mod.module = 'pizza'
ON CONFLICT (empresa_id, id) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  imagem_url = EXCLUDED.imagem_url,
  ordem = EXCLUDED.ordem,
  ativo = EXCLUDED.ativo,
  extra = EXCLUDED.extra,
  updated_at = now();

INSERT INTO public.store_pizza_categorias (
  empresa_id, id, nome_publico, descricao, imagem_url, ordem, ativo, extra
)
SELECT
  mod.empresa_id,
  COALESCE(NULLIF(c->>'id', ''), gen_random_uuid()::text),
  COALESCE(NULLIF(c->>'nomePublico', ''), 'Pizza'),
  COALESCE(c->>'descricao', ''),
  COALESCE(c->>'imagemUrl', ''),
  COALESCE((c->>'ordem')::int, 0),
  COALESCE((c->>'ativo')::boolean, true),
  (c - 'id' - 'nomePublico' - 'descricao' - 'imagemUrl' - 'ordem' - 'ativo')
FROM public.store_catalog_modules mod
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(mod.data->'pizzaCardapio'->'categorias', '[]'::jsonb)) AS c
WHERE mod.module = 'pizza'
ON CONFLICT (empresa_id, id) DO UPDATE SET
  nome_publico = EXCLUDED.nome_publico,
  descricao = EXCLUDED.descricao,
  imagem_url = EXCLUDED.imagem_url,
  ordem = EXCLUDED.ordem,
  ativo = EXCLUDED.ativo,
  extra = EXCLUDED.extra,
  updated_at = now();

INSERT INTO public.store_marmita_grupos (empresa_id, id, nome, ordem, ativo, extra)
SELECT
  mod.empresa_id,
  COALESCE(NULLIF(g->>'id', ''), gen_random_uuid()::text),
  COALESCE(NULLIF(g->>'nome', ''), 'Grupo'),
  COALESCE((g->>'ordem')::int, 0),
  COALESCE((g->>'ativo')::boolean, true),
  jsonb_build_object(
    'permitirDiasDuplicados', COALESCE((g->>'permitirDiasDuplicados')::boolean, false)
  )
FROM public.store_catalog_modules mod
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(mod.data->'marmitaGrupos', '[]'::jsonb)) AS g
WHERE mod.module = 'marmita'
ON CONFLICT (empresa_id, id) DO UPDATE SET
  nome = EXCLUDED.nome,
  ordem = EXCLUDED.ordem,
  ativo = EXCLUDED.ativo,
  extra = EXCLUDED.extra,
  updated_at = now();

INSERT INTO public.store_marmitas (
  empresa_id, id, tag_admin, nome_publico, descricao, imagem_url,
  categoria_id, grupo_id, dia_semana, ordem, ativo, extra
)
SELECT
  mod.empresa_id,
  COALESCE(NULLIF(m->>'id', ''), gen_random_uuid()::text),
  COALESCE(m->>'tagAdmin', ''),
  COALESCE(m->>'nomePublico', ''),
  COALESCE(m->>'descricao', ''),
  COALESCE(m->>'imagemUrl', ''),
  COALESCE(m->>'categoriaId', ''),
  COALESCE(m->>'grupoId', ''),
  COALESCE(m->>'diaSemana', ''),
  COALESCE((m->>'ordem')::int, 0),
  COALESCE((m->>'ativo')::boolean, true),
  (m - 'id' - 'tagAdmin' - 'nomePublico' - 'descricao' - 'imagemUrl'
       - 'categoriaId' - 'grupoId' - 'diaSemana' - 'ordem' - 'ativo')
FROM public.store_catalog_modules mod
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(mod.data->'marmitas', '[]'::jsonb)) AS m
WHERE mod.module = 'marmita'
ON CONFLICT (empresa_id, id) DO UPDATE SET
  tag_admin = EXCLUDED.tag_admin,
  nome_publico = EXCLUDED.nome_publico,
  descricao = EXCLUDED.descricao,
  imagem_url = EXCLUDED.imagem_url,
  categoria_id = EXCLUDED.categoria_id,
  grupo_id = EXCLUDED.grupo_id,
  dia_semana = EXCLUDED.dia_semana,
  ordem = EXCLUDED.ordem,
  ativo = EXCLUDED.ativo,
  extra = EXCLUDED.extra,
  updated_at = now();

INSERT INTO public.store_marmita_settings (empresa_id, data)
SELECT mod.empresa_id, COALESCE(mod.data->'marmitaCardapio', '{}'::jsonb)
FROM public.store_catalog_modules mod
WHERE mod.module = 'marmita'
ON CONFLICT (empresa_id) DO UPDATE SET
  data = EXCLUDED.data,
  updated_at = now();

-- Módulos: só promos daqui em diante
DELETE FROM public.store_catalog_modules
WHERE module IN ('pizza', 'marmita');

ALTER TABLE public.store_catalog_modules
  DROP CONSTRAINT IF EXISTS store_catalog_modules_module_check;

ALTER TABLE public.store_catalog_modules
  ADD CONSTRAINT store_catalog_modules_module_check
  CHECK (module IN ('promos'));
