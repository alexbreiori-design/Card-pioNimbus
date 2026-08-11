-- Áreas de exclusão de entrega (retângulos por empresa)
CREATE TABLE IF NOT EXISTS areas_exclusao_entrega (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas (id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT 'Exclusão',
  sul NUMERIC(10, 7) NOT NULL,
  oeste NUMERIC(10, 7) NOT NULL,
  norte NUMERIC(10, 7) NOT NULL,
  leste NUMERIC(10, 7) NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT areas_exclusao_bounds_check CHECK (norte >= sul AND leste >= oeste)
);

CREATE INDEX IF NOT EXISTS idx_areas_exclusao_empresa
  ON areas_exclusao_entrega (empresa_id);

ALTER TABLE areas_exclusao_entrega ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS areas_exclusao_membro ON areas_exclusao_entrega;
CREATE POLICY areas_exclusao_membro ON areas_exclusao_entrega FOR ALL
  USING (usuario_pertence_empresa(empresa_id))
  WITH CHECK (usuario_pertence_empresa(empresa_id));

DROP POLICY IF EXISTS areas_exclusao_publica ON areas_exclusao_entrega;
CREATE POLICY areas_exclusao_publica ON areas_exclusao_entrega FOR SELECT
  USING (
    ativo = true
    AND EXISTS (
      SELECT 1 FROM empresas e
      WHERE e.id = empresa_id AND e.aberta = true
    )
  );
