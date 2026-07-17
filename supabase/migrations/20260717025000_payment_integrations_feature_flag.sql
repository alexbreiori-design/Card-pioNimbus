ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS pagamentos_online_habilitados BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.empresas.pagamentos_online_habilitados IS
  'Feature flag controlada pelo Super Admin para liberar integrações e checkout de pagamentos online.';

UPDATE public.empresas
SET pagamentos_online_habilitados = true
WHERE slug = 'loja-teste';
