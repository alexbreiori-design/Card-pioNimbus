-- Migration 010: campos para super-admin (métricas + go-live)
-- Execute no SQL Editor do Supabase
-- Métricas: padrão ativo (acordado no contrato com o cliente; sem opt-in na UI).

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS compartilha_metricas_nimbus BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS metricas_consentimento_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data_go_live DATE;

UPDATE public.empresas
SET
  compartilha_metricas_nimbus = true,
  metricas_consentimento_em = COALESCE(metricas_consentimento_em, created_at, now())
WHERE compartilha_metricas_nimbus IS NOT TRUE
   OR metricas_consentimento_em IS NULL;

COMMENT ON COLUMN public.empresas.compartilha_metricas_nimbus IS
  'Nimbus acompanha métricas agregadas (contrato). Padrão true; sem toggle para o lojista.';
COMMENT ON COLUMN public.empresas.data_go_live IS
  'Data de início do cardápio — usada em comparativos antes/depois.';
