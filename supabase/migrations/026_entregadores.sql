-- Entregadores da loja + vínculo com rotas e pedidos

CREATE TABLE IF NOT EXISTS public.entregadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas (id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entregadores_empresa_ativo
  ON public.entregadores (empresa_id, ativo, nome);

ALTER TABLE public.entregadores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS entregadores_membro ON public.entregadores;
CREATE POLICY entregadores_membro ON public.entregadores FOR ALL
  USING (public.usuario_pertence_empresa(empresa_id))
  WITH CHECK (public.usuario_pertence_empresa(empresa_id));

ALTER TABLE public.entrega_rotas
  ADD COLUMN IF NOT EXISTS entregador_id UUID REFERENCES public.entregadores (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ativa';

CREATE INDEX IF NOT EXISTS idx_entrega_rotas_empresa_status
  ON public.entrega_rotas (empresa_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_entrega_rotas_entregador
  ON public.entrega_rotas (entregador_id);

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS entregador_id UUID REFERENCES public.entregadores (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS entrega_rota_id UUID REFERENCES public.entrega_rotas (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pedidos_entregador
  ON public.pedidos (empresa_id, entregador_id)
  WHERE entregador_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pedidos_entrega_rota
  ON public.pedidos (empresa_id, entrega_rota_id)
  WHERE entrega_rota_id IS NOT NULL;
