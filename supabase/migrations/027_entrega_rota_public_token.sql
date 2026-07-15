-- Token público da rota (entregador marca entregue sem app)

ALTER TABLE public.entrega_rotas
  ADD COLUMN IF NOT EXISTS public_token TEXT,
  ADD COLUMN IF NOT EXISTS concluida_em TIMESTAMPTZ;

UPDATE public.entrega_rotas
SET public_token = replace(gen_random_uuid()::text, '-', '')
WHERE public_token IS NULL OR public_token = '';

ALTER TABLE public.entrega_rotas
  ALTER COLUMN public_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_entrega_rotas_public_token
  ON public.entrega_rotas (public_token);
