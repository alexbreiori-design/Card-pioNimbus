-- Leitura pública de zonas ativas (cálculo de taxa no cardápio)
DROP POLICY IF EXISTS zonas_entrega_publica ON zonas_entrega;
CREATE POLICY zonas_entrega_publica ON zonas_entrega FOR SELECT
  USING (
    ativo = true
    AND EXISTS (SELECT 1 FROM empresas e WHERE e.id = empresa_id AND e.aberta = true)
  );
