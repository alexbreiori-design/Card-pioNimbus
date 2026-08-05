-- Fiado: ledger da conta do cliente + cache de saldo + recebimentos no caixa

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS saldo_fiado NUMERIC(10, 2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.cliente_conta_movimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('debito_pedido', 'credito_baixa', 'estorno')),
  valor NUMERIC(10, 2) NOT NULL CHECK (valor > 0),
  pedido_id UUID REFERENCES public.pedidos(id) ON DELETE SET NULL,
  forma_recebimento TEXT,
  caixa_turno_id UUID REFERENCES public.caixa_turnos(id) ON DELETE SET NULL,
  observacao TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cliente_conta_mov_empresa_cliente
  ON public.cliente_conta_movimentos (empresa_id, cliente_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cliente_conta_mov_pedido
  ON public.cliente_conta_movimentos (pedido_id)
  WHERE pedido_id IS NOT NULL;

-- Um débito por pedido (idempotente ao concluir)
CREATE UNIQUE INDEX IF NOT EXISTS idx_cliente_conta_debito_pedido_unico
  ON public.cliente_conta_movimentos (pedido_id)
  WHERE tipo = 'debito_pedido' AND pedido_id IS NOT NULL;

-- Um estorno por pedido
CREATE UNIQUE INDEX IF NOT EXISTS idx_cliente_conta_estorno_pedido_unico
  ON public.cliente_conta_movimentos (pedido_id)
  WHERE tipo = 'estorno' AND pedido_id IS NOT NULL;

ALTER TABLE public.cliente_conta_movimentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cliente_conta_movimentos_membro ON public.cliente_conta_movimentos;
CREATE POLICY cliente_conta_movimentos_membro ON public.cliente_conta_movimentos FOR ALL
  USING (usuario_pertence_empresa(empresa_id))
  WITH CHECK (usuario_pertence_empresa(empresa_id));

-- Caixa: recebimento de conta (baixa de fiado) sem misturar com sangria/suprimento
ALTER TABLE public.caixa_movimentos DROP CONSTRAINT IF EXISTS caixa_movimentos_tipo_check;
ALTER TABLE public.caixa_movimentos
  ADD CONSTRAINT caixa_movimentos_tipo_check
  CHECK (tipo IN ('sangria', 'suprimento', 'recebimento_conta'));

ALTER TABLE public.caixa_movimentos
  ADD COLUMN IF NOT EXISTS forma_pagamento_codigo TEXT;

ALTER TABLE public.caixa_movimentos
  ADD COLUMN IF NOT EXISTS cliente_conta_movimento_id UUID
    REFERENCES public.cliente_conta_movimentos(id) ON DELETE SET NULL;

-- Debita a conta do cliente ao concluir pedido fiado (idempotente)
CREATE OR REPLACE FUNCTION public.fiado_debito_pedido(p_empresa_id UUID, p_pedido_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_pedido RECORD;
  v_mov_id UUID;
BEGIN
  IF p_empresa_id IS NULL OR p_pedido_id IS NULL THEN
    RETURN NULL;
  END IF;
  IF NOT usuario_pertence_empresa(p_empresa_id) THEN
    RAISE EXCEPTION 'Sem acesso à empresa.';
  END IF;

  SELECT id, cliente_id, total, forma_pagamento_codigo, status
    INTO v_pedido
  FROM pedidos
  WHERE id = p_pedido_id AND empresa_id = p_empresa_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado.';
  END IF;
  IF v_pedido.forma_pagamento_codigo IS DISTINCT FROM 'fiado' THEN
    RETURN NULL;
  END IF;
  IF v_pedido.status IS DISTINCT FROM 'concluido' THEN
    RETURN NULL;
  END IF;
  IF v_pedido.cliente_id IS NULL THEN
    RAISE EXCEPTION 'Pedido fiado sem cliente vinculado.';
  END IF;
  IF ROUND(COALESCE(v_pedido.total, 0)::numeric, 2) <= 0 THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_mov_id
  FROM cliente_conta_movimentos
  WHERE pedido_id = p_pedido_id AND tipo = 'debito_pedido'
  LIMIT 1;
  IF v_mov_id IS NOT NULL THEN
    RETURN v_mov_id;
  END IF;

  INSERT INTO cliente_conta_movimentos (
    empresa_id, cliente_id, tipo, valor, pedido_id, created_by
  ) VALUES (
    p_empresa_id,
    v_pedido.cliente_id,
    'debito_pedido',
    ROUND(v_pedido.total::numeric, 2),
    p_pedido_id,
    auth.uid()
  )
  RETURNING id INTO v_mov_id;

  UPDATE clientes
  SET saldo_fiado = ROUND((COALESCE(saldo_fiado, 0) + v_pedido.total)::numeric, 2),
      updated_at = now()
  WHERE id = v_pedido.cliente_id AND empresa_id = p_empresa_id;

  RETURN v_mov_id;
END;
$$;

-- Estorna débito fiado (cancelamento ou reabertura de concluído)
CREATE OR REPLACE FUNCTION public.fiado_estorno_pedido(p_empresa_id UUID, p_pedido_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_debito RECORD;
  v_mov_id UUID;
BEGIN
  IF p_empresa_id IS NULL OR p_pedido_id IS NULL THEN
    RETURN NULL;
  END IF;
  IF NOT usuario_pertence_empresa(p_empresa_id) THEN
    RAISE EXCEPTION 'Sem acesso à empresa.';
  END IF;

  SELECT id INTO v_mov_id
  FROM cliente_conta_movimentos
  WHERE pedido_id = p_pedido_id AND tipo = 'estorno'
  LIMIT 1;
  IF v_mov_id IS NOT NULL THEN
    RETURN v_mov_id;
  END IF;

  SELECT id, cliente_id, valor
    INTO v_debito
  FROM cliente_conta_movimentos
  WHERE pedido_id = p_pedido_id
    AND empresa_id = p_empresa_id
    AND tipo = 'debito_pedido'
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  INSERT INTO cliente_conta_movimentos (
    empresa_id, cliente_id, tipo, valor, pedido_id, observacao, created_by
  ) VALUES (
    p_empresa_id,
    v_debito.cliente_id,
    'estorno',
    v_debito.valor,
    p_pedido_id,
    'Estorno de pedido fiado',
    auth.uid()
  )
  RETURNING id INTO v_mov_id;

  UPDATE clientes
  SET saldo_fiado = GREATEST(
        0,
        ROUND((COALESCE(saldo_fiado, 0) - v_debito.valor)::numeric, 2)
      ),
      updated_at = now()
  WHERE id = v_debito.cliente_id AND empresa_id = p_empresa_id;

  RETURN v_mov_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fiado_debito_pedido(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fiado_estorno_pedido(UUID, UUID) TO authenticated;
