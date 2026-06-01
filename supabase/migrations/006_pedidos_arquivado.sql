-- Migration 006: pedidos — arquivamento + índice para polling
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS arquivado BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_pedidos_empresa_updated
  ON public.pedidos (empresa_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_pedidos_empresa_phone
  ON public.pedidos (empresa_id, cliente_telefone);
