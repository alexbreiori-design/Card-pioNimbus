-- =============================================================================
-- Cardápio Digital — Schema multi-empresa (Supabase / Postgres)
-- Cole este arquivo no SQL Editor do Supabase e execute em ordem.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------------------------

CREATE TYPE membro_papel AS ENUM ('proprietario', 'gerente', 'atendente');
CREATE TYPE pedido_status AS ENUM (
  'novo',
  'em_preparo',
  'saiu_entrega',
  'concluido',
  'cancelado'
);
CREATE TYPE pedido_tipo AS ENUM ('delivery', 'retirada', 'balcao');
CREATE TYPE pedido_origem AS ENUM ('cardapio_online', 'admin_manual');

-- -----------------------------------------------------------------------------
-- EMPRESAS (lojas / tenants)
-- -----------------------------------------------------------------------------

CREATE TABLE empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  logo_url TEXT,
  -- Identidade do cardápio público (customizável por loja)
  cor_marca TEXT NOT NULL DEFAULT '#8B2FC9',
  cnpj TEXT,
  telefone TEXT,
  email TEXT,
  endereco_logradouro TEXT,
  endereco_numero TEXT,
  endereco_bairro TEXT,
  endereco_cidade TEXT,
  endereco_estado TEXT,
  endereco_cep TEXT,
  horario_texto TEXT,
  aberta BOOLEAN NOT NULL DEFAULT true,
  meta_pixel_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_empresas_slug ON empresas (slug);

-- -----------------------------------------------------------------------------
-- PERFIS (vinculado ao auth.users do Supabase)
-- -----------------------------------------------------------------------------

CREATE TABLE perfis (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  nome TEXT,
  telefone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- MEMBROS (usuário ↔ empresa, multi-loja)
-- -----------------------------------------------------------------------------

CREATE TABLE empresa_membros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas (id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  papel membro_papel NOT NULL DEFAULT 'atendente',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, usuario_id)
);

CREATE INDEX idx_empresa_membros_usuario ON empresa_membros (usuario_id);
CREATE INDEX idx_empresa_membros_empresa ON empresa_membros (empresa_id);

-- -----------------------------------------------------------------------------
-- CATEGORIAS E PRODUTOS
-- -----------------------------------------------------------------------------

CREATE TABLE categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas (id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categorias_empresa ON categorias (empresa_id, ordem);

CREATE TABLE produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas (id) ON DELETE CASCADE,
  categoria_id UUID NOT NULL REFERENCES categorias (id) ON DELETE RESTRICT,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC(10, 2) NOT NULL CHECK (preco >= 0),
  imagem_url TEXT,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_produtos_empresa ON produtos (empresa_id, categoria_id, ordem);

-- -----------------------------------------------------------------------------
-- ADICIONAIS (grupos e itens, como no cardápio atual)
-- -----------------------------------------------------------------------------

CREATE TABLE grupo_adicionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES produtos (id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas (id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  obrigatorio BOOLEAN NOT NULL DEFAULT false,
  min_selecao INT NOT NULL DEFAULT 0,
  max_selecao INT NOT NULL DEFAULT 1,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_grupo_adicionais_produto ON grupo_adicionais (produto_id, ordem);

CREATE TABLE adicional_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID NOT NULL REFERENCES grupo_adicionais (id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas (id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco_extra NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (preco_extra >= 0),
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_adicional_itens_grupo ON adicional_itens (grupo_id, ordem);

-- -----------------------------------------------------------------------------
-- FORMAS DE PAGAMENTO (por empresa)
-- -----------------------------------------------------------------------------

CREATE TABLE formas_pagamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas (id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  grupo TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INT NOT NULL DEFAULT 0,
  UNIQUE (empresa_id, codigo)
);

-- -----------------------------------------------------------------------------
-- ZONAS DE ENTREGA
-- -----------------------------------------------------------------------------

CREATE TABLE zonas_entrega (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas (id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  raio_km NUMERIC(6, 2),
  taxa_entrega NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (taxa_entrega >= 0),
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_zonas_entrega_empresa ON zonas_entrega (empresa_id);

-- -----------------------------------------------------------------------------
-- CLIENTES
-- -----------------------------------------------------------------------------

CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas (id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, telefone)
);

CREATE INDEX idx_clientes_empresa ON clientes (empresa_id);

CREATE TABLE cliente_enderecos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes (id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas (id) ON DELETE CASCADE,
  cep TEXT,
  rua TEXT NOT NULL,
  numero TEXT,
  bairro TEXT NOT NULL,
  complemento TEXT,
  referencia TEXT,
  cidade TEXT NOT NULL,
  estado TEXT NOT NULL,
  principal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cliente_enderecos_cliente ON cliente_enderecos (cliente_id);

-- -----------------------------------------------------------------------------
-- PEDIDOS
-- -----------------------------------------------------------------------------

CREATE TABLE pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas (id) ON DELETE CASCADE,
  codigo TEXT,
  cliente_id UUID REFERENCES clientes (id) ON DELETE SET NULL,
  status pedido_status NOT NULL DEFAULT 'novo',
  tipo pedido_tipo NOT NULL DEFAULT 'delivery',
  origem pedido_origem NOT NULL DEFAULT 'cardapio_online',
  -- Snapshot do cliente (pedido manual / histórico)
  cliente_nome TEXT,
  cliente_telefone TEXT,
  endereco_texto TEXT,
  atendente_nome TEXT,
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
  taxa_entrega NUMERIC(10, 2) NOT NULL DEFAULT 0,
  acrescimo NUMERIC(10, 2) NOT NULL DEFAULT 0,
  desconto NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  forma_pagamento_codigo TEXT,
  troco_para NUMERIC(10, 2),
  cupom_codigo TEXT,
  observacao TEXT,
  entregar_ate TIMESTAMPTZ,
  status_novo_em TIMESTAMPTZ,
  status_em_preparo_em TIMESTAMPTZ,
  status_saiu_entrega_em TIMESTAMPTZ,
  status_concluido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pedidos_empresa_status ON pedidos (empresa_id, status, created_at DESC);
CREATE INDEX idx_pedidos_codigo ON pedidos (empresa_id, codigo);

CREATE TABLE pedido_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos (id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas (id) ON DELETE CASCADE,
  produto_id UUID REFERENCES produtos (id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  quantidade INT NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  preco_unitario NUMERIC(10, 2) NOT NULL,
  preco_total NUMERIC(10, 2) NOT NULL,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pedido_itens_pedido ON pedido_itens (pedido_id);

CREATE TABLE pedido_item_opcoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_item_id UUID NOT NULL REFERENCES pedido_itens (id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas (id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  preco_extra NUMERIC(10, 2) NOT NULL DEFAULT 0
);

-- -----------------------------------------------------------------------------
-- TRIGGER updated_at
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER empresas_updated_at BEFORE UPDATE ON empresas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER perfis_updated_at BEFORE UPDATE ON perfis
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER categorias_updated_at BEFORE UPDATE ON categorias
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER produtos_updated_at BEFORE UPDATE ON produtos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER clientes_updated_at BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER pedidos_updated_at BEFORE UPDATE ON pedidos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS (Row Level Security)
-- -----------------------------------------------------------------------------

ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa_membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupo_adicionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE adicional_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE formas_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE zonas_entrega ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cliente_enderecos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_item_opcoes ENABLE ROW LEVEL SECURITY;

-- Helper: usuário pertence à empresa
CREATE OR REPLACE FUNCTION usuario_pertence_empresa(eid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM empresa_membros
    WHERE empresa_id = eid
      AND usuario_id = auth.uid()
      AND ativo = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Perfis: próprio usuário
CREATE POLICY perfis_select_own ON perfis FOR SELECT USING (id = auth.uid());
CREATE POLICY perfis_update_own ON perfis FOR UPDATE USING (id = auth.uid());
CREATE POLICY perfis_insert_own ON perfis FOR INSERT WITH CHECK (id = auth.uid());

-- Empresas: membros leem; cardápio público lê por slug (policy anon abaixo)
CREATE POLICY empresas_select_membro ON empresas FOR SELECT
  USING (usuario_pertence_empresa(id));
CREATE POLICY empresas_update_membro ON empresas FOR UPDATE
  USING (usuario_pertence_empresa(id));

-- Cardápio público: leitura de empresa aberta por slug
CREATE POLICY empresas_select_publica ON empresas FOR SELECT
  USING (aberta = true);

CREATE POLICY empresa_membros_select ON empresa_membros FOR SELECT
  USING (usuario_id = auth.uid());

-- Template policies para tabelas com empresa_id
CREATE POLICY categorias_membro ON categorias FOR ALL
  USING (usuario_pertence_empresa(empresa_id))
  WITH CHECK (usuario_pertence_empresa(empresa_id));

CREATE POLICY produtos_membro ON produtos FOR ALL
  USING (usuario_pertence_empresa(empresa_id))
  WITH CHECK (usuario_pertence_empresa(empresa_id));

CREATE POLICY grupo_adicionais_membro ON grupo_adicionais FOR ALL
  USING (usuario_pertence_empresa(empresa_id))
  WITH CHECK (usuario_pertence_empresa(empresa_id));

CREATE POLICY adicional_itens_membro ON adicional_itens FOR ALL
  USING (usuario_pertence_empresa(empresa_id))
  WITH CHECK (usuario_pertence_empresa(empresa_id));

CREATE POLICY formas_pagamento_membro ON formas_pagamento FOR ALL
  USING (usuario_pertence_empresa(empresa_id))
  WITH CHECK (usuario_pertence_empresa(empresa_id));

CREATE POLICY zonas_entrega_membro ON zonas_entrega FOR ALL
  USING (usuario_pertence_empresa(empresa_id))
  WITH CHECK (usuario_pertence_empresa(empresa_id));

CREATE POLICY clientes_membro ON clientes FOR ALL
  USING (usuario_pertence_empresa(empresa_id))
  WITH CHECK (usuario_pertence_empresa(empresa_id));

CREATE POLICY cliente_enderecos_membro ON cliente_enderecos FOR ALL
  USING (usuario_pertence_empresa(empresa_id))
  WITH CHECK (usuario_pertence_empresa(empresa_id));

CREATE POLICY pedidos_membro ON pedidos FOR ALL
  USING (usuario_pertence_empresa(empresa_id))
  WITH CHECK (usuario_pertence_empresa(empresa_id));

CREATE POLICY pedido_itens_membro ON pedido_itens FOR ALL
  USING (usuario_pertence_empresa(empresa_id))
  WITH CHECK (usuario_pertence_empresa(empresa_id));

CREATE POLICY pedido_item_opcoes_membro ON pedido_item_opcoes FOR ALL
  USING (usuario_pertence_empresa(empresa_id))
  WITH CHECK (usuario_pertence_empresa(empresa_id));

-- Leitura pública: categorias/produtos ativos (cardápio online)
CREATE POLICY categorias_publica ON categorias FOR SELECT
  USING (
    ativo = true
    AND EXISTS (SELECT 1 FROM empresas e WHERE e.id = empresa_id AND e.aberta = true)
  );

CREATE POLICY produtos_publica ON produtos FOR SELECT
  USING (
    ativo = true
    AND EXISTS (SELECT 1 FROM empresas e WHERE e.id = empresa_id AND e.aberta = true)
  );

-- Pedidos: inserção pública (checkout) — ajuste conforme sua API
-- Recomendado: criar pedidos via Edge Function ou service role no servidor.
-- Política exemplo (anon pode inserir se souber empresa_id — use com cautela):
-- CREATE POLICY pedidos_insert_publico ON pedidos FOR INSERT
--   WITH CHECK (origem = 'cardapio_online');

-- -----------------------------------------------------------------------------
-- SEED opcional (descomente após criar um usuário no Auth)
-- -----------------------------------------------------------------------------
-- INSERT INTO empresas (slug, nome, cor_marca, telefone, endereco_cidade)
-- VALUES ('nome-loja', 'Nome da Loja', '#8B2FC9', '(11) 98888-1234', 'São Paulo');
