-- Migration 009: auditoria RLS (Etapa 3 — S3-02)
-- Execute no SQL Editor do Supabase após 001–008

-- -----------------------------------------------------------------------------
-- 1. Cupons (opcional): tabela só existe se migration 003 foi aplicada.
--    O app usa cupons em JSON (menu_store_state); esta seção é no-op se não houver tabela.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.cupons') IS NULL THEN
    RAISE NOTICE 'Tabela public.cupons ausente — pulando políticas de cupons.';
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS "cupons_write_authenticated" ON public.cupons';
  EXECUTE 'DROP POLICY IF EXISTS "cupons_select_public" ON public.cupons';
  EXECUTE 'DROP POLICY IF EXISTS cupons_membro ON public.cupons';
  EXECUTE 'DROP POLICY IF EXISTS cupons_select_loja_aberta ON public.cupons';

  EXECUTE $policy$
    CREATE POLICY cupons_membro ON public.cupons
      FOR ALL TO authenticated
      USING (public.usuario_pertence_empresa(empresa_id))
      WITH CHECK (public.usuario_pertence_empresa(empresa_id))
  $policy$;

  EXECUTE $policy$
    CREATE POLICY cupons_select_loja_aberta ON public.cupons
      FOR SELECT TO anon, authenticated
      USING (
        ativo = true
        AND EXISTS (
          SELECT 1 FROM public.empresas e
          WHERE e.id = empresa_id AND e.aberta = true
        )
      )
  $policy$;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Empresas: remove SELECT público amplo (exponha chave_pix/cnpj via anon)
--    Cardápio público usa RPCs SECURITY DEFINER abaixo + get_public_store_catalog.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS empresas_select_publica ON public.empresas;

-- Coluna usada no RPC público (migration 008 — idempotente)
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS segmento TEXT;

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
  ORDER BY created_at ASC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_first_open_empresa_slug() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_first_open_empresa_slug() TO anon, authenticated;

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
  WHERE e.slug = store_slug AND e.aberta = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_empresa_cardapio(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_empresa_cardapio(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.health_ping()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.empresas LIMIT 1);
$$;

REVOKE ALL ON FUNCTION public.health_ping() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.health_ping() TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. Confirmação: pedidos/clientes permanecem só para membros (sem INSERT anon)
--    Políticas em schema.sql: pedidos_membro, clientes_membro.
--    Checkout usa service role em POST /api/public-order (servidor).
-- -----------------------------------------------------------------------------
