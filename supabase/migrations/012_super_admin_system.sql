-- Migration 012: suspensão de lojas, CRM Nimbus e perfil do sistema
-- Execute no SQL Editor do Supabase

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS suspensa BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspensa_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS responsavel_nimbus TEXT,
  ADD COLUMN IF NOT EXISTS contrato_inicio DATE,
  ADD COLUMN IF NOT EXISTS contrato_fim DATE;

COMMENT ON COLUMN public.empresas.suspensa IS
  'Quando true, cardápio público e login do lojista ficam indisponíveis.';
COMMENT ON COLUMN public.empresas.suspensa_em IS
  'Momento em que a loja foi suspensa (null ao reativar).';
COMMENT ON COLUMN public.empresas.responsavel_nimbus IS
  'Responsável interno Nimbus (CRM).';
COMMENT ON COLUMN public.empresas.contrato_inicio IS
  'Início do contrato mensal (CRM).';
COMMENT ON COLUMN public.empresas.contrato_fim IS
  'Fim do contrato mensal (CRM).';

CREATE TABLE IF NOT EXISTS public.nimbus_perfil_sistema (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  nome_exibicao TEXT,
  whatsapp_suporte TEXT,
  email TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.nimbus_perfil_sistema (id, nome_exibicao)
VALUES (1, 'Nimbus')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.nimbus_perfil_sistema ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.nimbus_perfil_sistema IS
  'Perfil global Nimbus (suporte, saudação). Gerido via super-admin / service role.';

-- Cardápio público: não expor lojas suspensas
CREATE OR REPLACE FUNCTION public.get_public_empresa_cardapio(store_slug TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', e.id,
    'slug', e.slug,
    'nome', e.nome,
    'cor_marca', e.cor_marca,
    'telefone', e.telefone,
    'segmento', e.segmento,
    'latitude', e.latitude,
    'longitude', e.longitude,
    'endereco_logradouro', e.endereco_logradouro,
    'endereco_numero', e.endereco_numero,
    'endereco_bairro', e.endereco_bairro,
    'endereco_cidade', e.endereco_cidade,
    'endereco_estado', e.endereco_estado,
    'endereco_cep', e.endereco_cep
  )
  FROM public.empresas e
  WHERE e.slug = store_slug
    AND e.aberta = true
    AND COALESCE(e.suspensa, false) = false
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_first_open_empresa_slug()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT slug
  FROM public.empresas
  WHERE aberta = true
    AND COALESCE(suspensa, false) = false
  ORDER BY created_at ASC
  LIMIT 1;
$$;
