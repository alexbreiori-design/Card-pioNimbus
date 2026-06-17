-- Caixa: turnos, movimentos e vínculo com pedidos

CREATE TABLE IF NOT EXISTS caixa_turnos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  numero_turno INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado')),
  valor_abertura NUMERIC(10, 2) NOT NULL DEFAULT 0,
  valor_fechamento_contado NUMERIC(10, 2),
  valor_esperado_dinheiro NUMERIC(10, 2),
  diferenca_dinheiro NUMERIC(10, 2),
  total_vendas NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_pedidos INT NOT NULL DEFAULT 0,
  observacao_fechamento TEXT,
  aberto_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  fechado_em TIMESTAMPTZ,
  aberto_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  fechado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reaberto_em TIMESTAMPTZ,
  reabertura_justificativa TEXT,
  reaberto_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS caixa_movimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turno_id UUID NOT NULL REFERENCES caixa_turnos(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('sangria', 'suprimento')),
  valor NUMERIC(10, 2) NOT NULL CHECK (valor > 0),
  descricao TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS caixa_turno_id UUID REFERENCES caixa_turnos(id) ON DELETE SET NULL;

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS aguardando_caixa BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_caixa_turnos_empresa_status
  ON caixa_turnos(empresa_id, status);

CREATE INDEX IF NOT EXISTS idx_caixa_turnos_empresa_aberto_em
  ON caixa_turnos(empresa_id, aberto_em DESC);

CREATE INDEX IF NOT EXISTS idx_caixa_movimentos_turno
  ON caixa_movimentos(turno_id);

CREATE INDEX IF NOT EXISTS idx_pedidos_aguardando_caixa
  ON pedidos(empresa_id, aguardando_caixa)
  WHERE aguardando_caixa = true;

CREATE INDEX IF NOT EXISTS idx_pedidos_caixa_turno
  ON pedidos(caixa_turno_id)
  WHERE caixa_turno_id IS NOT NULL;

-- Apenas um turno aberto por loja
CREATE UNIQUE INDEX IF NOT EXISTS idx_caixa_turnos_empresa_aberto_unico
  ON caixa_turnos(empresa_id)
  WHERE status = 'aberto';

ALTER TABLE caixa_turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE caixa_movimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY caixa_turnos_membro ON caixa_turnos FOR ALL
  USING (usuario_pertence_empresa(empresa_id))
  WITH CHECK (usuario_pertence_empresa(empresa_id));

CREATE POLICY caixa_movimentos_membro ON caixa_movimentos FOR ALL
  USING (usuario_pertence_empresa(empresa_id))
  WITH CHECK (usuario_pertence_empresa(empresa_id));
