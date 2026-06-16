-- Migration 020: lojista controla exibição do Pix no cardápio online
-- Execute no SQL Editor do Supabase

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS exibir_pix_cardapio BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.empresas.exibir_pix_cardapio IS
  'Quando false, o checkout público exibe apenas formas de pagamento na entrega.';
