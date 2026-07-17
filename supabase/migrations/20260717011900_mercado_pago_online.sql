-- Mercado Pago / pagamentos online multi-tenant.
-- Credenciais ficam cifradas pela aplicação e inacessíveis a anon/authenticated.

CREATE TABLE public.empresa_pagamento_contas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas (id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('mercado_pago', 'pagarme', 'pagbank')),
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'desconectado', 'erro')),
  access_token_ciphertext TEXT,
  refresh_token_ciphertext TEXT,
  public_key TEXT,
  provider_user_id TEXT,
  token_expires_at TIMESTAMPTZ,
  token_refresh_started_at TIMESTAMPTZ,
  metodos JSONB NOT NULL DEFAULT '{"pix": true, "credit_card": true}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, provider)
);

CREATE UNIQUE INDEX idx_empresa_pagamento_conta_ativa
  ON public.empresa_pagamento_contas (empresa_id)
  WHERE status = 'ativo';

CREATE INDEX idx_empresa_pagamento_contas_empresa
  ON public.empresa_pagamento_contas (empresa_id, status);

ALTER TABLE public.empresa_pagamento_contas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.empresa_pagamento_contas FROM anon, authenticated;

CREATE TABLE public.pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas (id) ON DELETE CASCADE,
  pedido_id UUID REFERENCES public.pedidos (id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK (provider IN ('mercado_pago', 'pagarme', 'pagbank')),
  provider_payment_id TEXT,
  idempotency_key UUID NOT NULL DEFAULT gen_random_uuid(),
  checkout_token_hash TEXT NOT NULL,
  metodo TEXT NOT NULL CHECK (metodo IN ('pix', 'credit_card', 'debit_card')),
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'processando', 'aprovado', 'recusado', 'estornado', 'cancelado', 'expirado', 'erro')),
  provider_status TEXT,
  status_detail TEXT,
  valor NUMERIC(10, 2) NOT NULL CHECK (valor > 0),
  qr_code TEXT,
  qr_code_base64 TEXT,
  ticket_url TEXT,
  order_payload JSONB NOT NULL,
  customer_payload JSONB NOT NULL,
  finalized_at TIMESTAMPTZ,
  finalization_started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_payment_id),
  UNIQUE (idempotency_key)
);

CREATE INDEX idx_pagamentos_empresa_created
  ON public.pagamentos (empresa_id, created_at DESC);
CREATE INDEX idx_pagamentos_pedido ON public.pagamentos (pedido_id);
CREATE INDEX idx_pagamentos_provider_payment
  ON public.pagamentos (provider, provider_payment_id);

ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY pagamentos_select_membro
  ON public.pagamentos
  FOR SELECT
  TO authenticated
  USING (public.usuario_pertence_empresa(empresa_id));

REVOKE INSERT, UPDATE, DELETE ON TABLE public.pagamentos FROM anon, authenticated;

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS pagamento_online BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pagamento_status TEXT NOT NULL DEFAULT 'nao_aplicavel'
    CHECK (pagamento_status IN (
      'nao_aplicavel', 'pendente', 'processando', 'aprovado',
      'recusado', 'estornado', 'cancelado', 'expirado', 'erro'
    )),
  ADD COLUMN IF NOT EXISTS pagamento_id UUID REFERENCES public.pagamentos (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pedidos_pagamento_status
  ON public.pedidos (empresa_id, pagamento_online, pagamento_status);

ALTER TABLE public.pagamentos
  ADD CONSTRAINT pagamentos_pedido_unico UNIQUE (pedido_id);

CREATE SCHEMA IF NOT EXISTS nimbus_private;

CREATE OR REPLACE FUNCTION nimbus_private.try_numeric(value TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
  RETURN NULLIF(value, '')::numeric;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION nimbus_private.try_integer(value TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
  RETURN NULLIF(value, '')::integer;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION nimbus_private.try_numeric(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION nimbus_private.try_integer(TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION nimbus_private.finalize_online_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order JSONB := NEW.order_payload -> 'order';
  v_validated JSONB := NEW.order_payload -> 'validated';
  v_customer JSONB := NEW.customer_payload;
  v_phone TEXT;
  v_cliente_id UUID;
  v_pedido_id UUID;
  v_turno_id UUID;
  v_created_at TIMESTAMPTZ;
  v_original_created TIMESTAMPTZ;
  v_original_deadline TIMESTAMPTZ;
  v_deadline TIMESTAMPTZ;
  v_address JSONB;
  v_item JSONB;
  v_product_id UUID;
BEGIN
  IF NEW.status <> 'aprovado' OR NEW.pedido_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_phone := regexp_replace(
    COALESCE(v_customer ->> 'phone', v_order ->> 'clienteTelefone', ''),
    '\D',
    '',
    'g'
  );
  IF length(v_phone) < 11 THEN
    RAISE EXCEPTION 'Telefone inválido no pagamento %', NEW.id;
  END IF;

  v_created_at := COALESCE(NEW.approved_at, now());
  v_original_created := COALESCE(
    NULLIF(v_order ->> 'createdAt', '')::timestamptz,
    NEW.created_at
  );
  v_original_deadline := COALESCE(
    NULLIF(v_order ->> 'entregarAte', '')::timestamptz,
    v_original_created
  );
  v_deadline := v_created_at + GREATEST(
    interval '0 seconds',
    v_original_deadline - v_original_created
  );

  INSERT INTO public.clientes (
    empresa_id,
    nome,
    telefone,
    total_pedidos,
    total_gasto,
    ultimo_pedido_em,
    updated_at
  )
  VALUES (
    NEW.empresa_id,
    COALESCE(NULLIF(trim(v_customer ->> 'name'), ''), NULLIF(trim(v_order ->> 'clienteNome'), ''), 'Cliente'),
    v_phone,
    1,
    NEW.valor,
    v_created_at,
    now()
  )
  ON CONFLICT (empresa_id, telefone)
  DO UPDATE SET
    nome = EXCLUDED.nome,
    total_pedidos = public.clientes.total_pedidos + 1,
    total_gasto = public.clientes.total_gasto + EXCLUDED.total_gasto,
    ultimo_pedido_em = EXCLUDED.ultimo_pedido_em,
    updated_at = now()
  RETURNING id INTO v_cliente_id;

  v_address := v_order -> 'endereco';
  IF v_address IS NOT NULL AND jsonb_typeof(v_address) = 'object' THEN
    DELETE FROM public.cliente_enderecos
    WHERE cliente_id = v_cliente_id
      AND empresa_id = NEW.empresa_id
      AND principal = true;

    INSERT INTO public.cliente_enderecos (
      cliente_id,
      empresa_id,
      cep,
      rua,
      numero,
      bairro,
      cidade,
      estado,
      complemento,
      referencia,
      principal
    )
    VALUES (
      v_cliente_id,
      NEW.empresa_id,
      NULLIF(v_address ->> 'cep', ''),
      COALESCE(NULLIF(v_address ->> 'logradouro', ''), '-'),
      NULLIF(v_address ->> 'numero', ''),
      COALESCE(NULLIF(v_address ->> 'bairro', ''), '-'),
      COALESCE(NULLIF(v_address ->> 'cidade', ''), '-'),
      COALESCE(NULLIF(v_address ->> 'estado', ''), '-'),
      NULLIF(v_address ->> 'complemento', ''),
      NULLIF(v_address ->> 'referencia', ''),
      true
    );
  END IF;

  SELECT id
  INTO v_turno_id
  FROM public.caixa_turnos
  WHERE empresa_id = NEW.empresa_id
    AND status = 'aberto'
  ORDER BY aberto_em DESC
  LIMIT 1;

  INSERT INTO public.pedidos (
    empresa_id,
    cliente_id,
    status,
    tipo,
    origem,
    cliente_nome,
    cliente_telefone,
    endereco_texto,
    endereco_latitude,
    endereco_longitude,
    distancia_km,
    subtotal,
    taxa_entrega,
    acrescimo,
    desconto,
    total,
    forma_pagamento_codigo,
    cupom_codigo,
    observacao,
    entregar_ate,
    status_novo_em,
    created_at,
    caixa_turno_id,
    aguardando_caixa,
    pagamento_online,
    pagamento_status,
    pagamento_id
  )
  VALUES (
    NEW.empresa_id,
    v_cliente_id,
    'novo',
    CASE WHEN v_validated ->> 'tipo' = 'delivery' THEN 'delivery'::public.pedido_tipo ELSE 'retirada'::public.pedido_tipo END,
    'cardapio_online',
    COALESCE(v_order ->> 'clienteNome', v_customer ->> 'name'),
    v_phone,
    NULLIF(v_order ->> 'enderecoTexto', ''),
    nimbus_private.try_numeric(v_order ->> 'enderecoLatitude'),
    nimbus_private.try_numeric(v_order ->> 'enderecoLongitude'),
    nimbus_private.try_numeric(v_order ->> 'distanciaKm'),
    COALESCE((v_validated ->> 'subtotal')::numeric, 0),
    COALESCE((v_validated ->> 'frete')::numeric, 0),
    0,
    COALESCE((v_validated ->> 'desconto')::numeric, 0),
    NEW.valor,
    CASE WHEN NEW.metodo = 'pix' THEN 'pix_online' ELSE 'credito_online' END,
    NULLIF(v_order ->> 'cupomCodigo', ''),
    NULLIF(v_order ->> 'observacao', ''),
    v_deadline,
    v_created_at,
    v_created_at,
    v_turno_id,
    v_turno_id IS NULL,
    true,
    'aprovado',
    NEW.id
  )
  RETURNING id INTO v_pedido_id;

  FOR v_item IN
    SELECT value FROM jsonb_array_elements(COALESCE(v_order -> 'itens', '[]'::jsonb))
  LOOP
    BEGIN
      v_product_id := NULLIF(v_item ->> 'produtoId', '')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      v_product_id := NULL;
    END;

    INSERT INTO public.pedido_itens (
      pedido_id,
      empresa_id,
      produto_id,
      nome,
      quantidade,
      preco_unitario,
      preco_total,
      observacao
    )
    VALUES (
      v_pedido_id,
      NEW.empresa_id,
      v_product_id,
      COALESCE(v_item ->> 'nome', 'Item'),
      COALESCE(nimbus_private.try_integer(v_item ->> 'qtd'), 1),
      COALESCE(nimbus_private.try_numeric(v_item ->> 'precoUnit'), 0),
      COALESCE(nimbus_private.try_numeric(v_item ->> 'subtotal'), 0),
      NULLIF(v_item ->> 'obs', '')
    );
  END LOOP;

  NEW.pedido_id := v_pedido_id;
  NEW.finalized_at := now();
  NEW.finalization_started_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION nimbus_private.finalize_online_payment() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_finalize_online_payment
  BEFORE UPDATE OF status ON public.pagamentos
  FOR EACH ROW
  WHEN (NEW.status = 'aprovado' AND NEW.pedido_id IS NULL)
  EXECUTE FUNCTION nimbus_private.finalize_online_payment();
