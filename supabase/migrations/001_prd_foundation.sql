-- PRD foundation: geolocalização, PIX, pedidos, promoções, estatísticas de clientes
-- Execute no SQL Editor do Supabase após schema.sql

-- empresas
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS chave_pix TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS descricao_chave_pix TEXT;

-- pedidos (checkout / entrega)
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS endereco_latitude NUMERIC;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS endereco_longitude NUMERIC;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS distancia_km NUMERIC;

-- cache de estatísticas no CRM (atualizado ao concluir pedidos)
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS total_pedidos INT NOT NULL DEFAULT 0;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS total_gasto NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ultimo_pedido_em TIMESTAMPTZ;

-- promoções
CREATE TABLE IF NOT EXISTS promocoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas (id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos (id) ON DELETE CASCADE,
  valor_original NUMERIC(10, 2) NOT NULL CHECK (valor_original >= 0),
  valor_promocional NUMERIC(10, 2) NOT NULL CHECK (valor_promocional >= 0),
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, produto_id)
);

CREATE INDEX IF NOT EXISTS idx_promocoes_empresa ON promocoes (empresa_id, ordem);

ALTER TABLE promocoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS promocoes_membro ON promocoes;
CREATE POLICY promocoes_membro ON promocoes FOR ALL
  USING (usuario_pertence_empresa(empresa_id))
  WITH CHECK (usuario_pertence_empresa(empresa_id));

DROP POLICY IF EXISTS promocoes_publica ON promocoes;
CREATE POLICY promocoes_publica ON promocoes FOR SELECT
  USING (
    ativo = true
    AND EXISTS (SELECT 1 FROM empresas e WHERE e.id = empresa_id AND e.aberta = true)
  );

CREATE TRIGGER promocoes_updated_at BEFORE UPDATE ON promocoes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
