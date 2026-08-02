-- Carência (cortesia) com janela de datas no espelho de assinatura

ALTER TABLE public.empresa_assinaturas
  ADD COLUMN IF NOT EXISTS carencia_inicio TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS carencia_fim TIMESTAMPTZ;

COMMENT ON COLUMN public.empresa_assinaturas.carencia_inicio IS
  'Início da carência/cortesia definida no HQ.';
COMMENT ON COLUMN public.empresa_assinaturas.carencia_fim IS
  'Fim da carência — após essa data a assinatura deve vigorar (trial Stripe ou cobrança).';

CREATE INDEX IF NOT EXISTS idx_empresa_assinaturas_carencia_fim
  ON public.empresa_assinaturas (carencia_fim)
  WHERE status_local = 'cortesia' AND carencia_fim IS NOT NULL;
