-- Migration 024: versão do cardápio público por loja (v1 | v2)
-- Default v1 — lojas existentes não mudam até o super-admin alternar.

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS cardapio_publico_versao TEXT NOT NULL DEFAULT 'v1';

ALTER TABLE public.empresas
  DROP CONSTRAINT IF EXISTS empresas_cardapio_publico_versao_check;

ALTER TABLE public.empresas
  ADD CONSTRAINT empresas_cardapio_publico_versao_check
  CHECK (cardapio_publico_versao IN ('v1', 'v2'));

UPDATE public.empresas
SET cardapio_publico_versao = 'v1'
WHERE cardapio_publico_versao IS NULL
   OR cardapio_publico_versao NOT IN ('v1', 'v2');

COMMENT ON COLUMN public.empresas.cardapio_publico_versao IS
  'Layout do cardápio na URL pública /{slug}. Gerido via super-admin; default v1.';
