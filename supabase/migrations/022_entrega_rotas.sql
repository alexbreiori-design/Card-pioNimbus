-- Rotas de entrega (Fase 1)

CREATE TABLE IF NOT EXISTS entrega_rotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas (id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  pedido_ids UUID[] NOT NULL DEFAULT '{}',
  paradas JSONB NOT NULL DEFAULT '[]'::jsonb,
  maps_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entrega_rotas_empresa_created
  ON entrega_rotas (empresa_id, created_at DESC);

ALTER TABLE entrega_rotas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS entrega_rotas_membro ON entrega_rotas;
CREATE POLICY entrega_rotas_membro ON entrega_rotas FOR ALL
  USING (usuario_pertence_empresa(empresa_id))
  WITH CHECK (usuario_pertence_empresa(empresa_id));
