-- Permite renomear empresas.slug sem violar o FK de menu_store_state.
-- Em produção a PK de menu_store_state é `slug` (sem coluna `id`).

ALTER TABLE public.menu_store_state
  DROP CONSTRAINT IF EXISTS menu_store_state_slug_fkey;

ALTER TABLE public.menu_store_state
  ADD CONSTRAINT menu_store_state_slug_fkey
  FOREIGN KEY (slug) REFERENCES public.empresas (slug)
  ON DELETE CASCADE
  ON UPDATE CASCADE;
