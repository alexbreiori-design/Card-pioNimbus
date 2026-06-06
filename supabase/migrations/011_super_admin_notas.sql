-- Migration 011: notas internas Nimbus por loja (super-admin)

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS notas_nimbus TEXT;

COMMENT ON COLUMN public.empresas.notas_nimbus IS
  'Observações internas da equipe Nimbus (contrato, piloto, suporte). Não visível ao lojista.';
