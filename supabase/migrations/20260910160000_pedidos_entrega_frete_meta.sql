-- Metadados de frete no pedido (auditoria: zona + modo da distância).
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS entrega_zona_id UUID REFERENCES zonas_entrega (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS entrega_zona_nome TEXT,
  ADD COLUMN IF NOT EXISTS distancia_calculo TEXT;

COMMENT ON COLUMN pedidos.entrega_zona_id IS 'Zona de entrega usada no cálculo do frete (pedido online).';
COMMENT ON COLUMN pedidos.entrega_zona_nome IS 'Snapshot do nome da zona no momento do pedido.';
COMMENT ON COLUMN pedidos.distancia_calculo IS 'rota | linha_reta — como a distância foi medida para o match.';

ALTER TABLE pedidos
  DROP CONSTRAINT IF EXISTS pedidos_distancia_calculo_check;

ALTER TABLE pedidos
  ADD CONSTRAINT pedidos_distancia_calculo_check
  CHECK (
    distancia_calculo IS NULL
    OR distancia_calculo IN ('rota', 'linha_reta')
  );
