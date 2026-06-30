-- Exibição por categoria no cardápio público (opcional — layouts também ficam em store_catalog_modules).
-- Após aplicar, recarregue o schema do PostgREST no painel Supabase se a API não enxergar a coluna.
ALTER TABLE public.store_catalog_categorias
  ADD COLUMN IF NOT EXISTS exibicao_cardapio TEXT NOT NULL DEFAULT 'grid-4';

NOTIFY pgrst, 'reload schema';
