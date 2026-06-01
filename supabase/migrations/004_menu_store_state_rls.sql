-- Migration 004: RLS restritivo em menu_store_state (Fase 1 — segurança)
-- Execute no SQL Editor do Supabase após 001–003

CREATE OR REPLACE FUNCTION public.usuario_pertence_slug(store_slug TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.empresas e
    JOIN public.empresa_membros em ON em.empresa_id = e.id
    WHERE e.slug = store_slug
      AND em.usuario_id = auth.uid()
      AND em.ativo = true
  );
$$;

DROP POLICY IF EXISTS "menu_store_state_select_all" ON public.menu_store_state;
DROP POLICY IF EXISTS "menu_store_state_write_authenticated" ON public.menu_store_state;

-- Leitura/escrita apenas para membros da loja (slug)
CREATE POLICY "menu_store_state_select_membro"
ON public.menu_store_state
FOR SELECT
TO authenticated
USING (public.usuario_pertence_slug(slug));

CREATE POLICY "menu_store_state_write_membro"
ON public.menu_store_state
FOR ALL
TO authenticated
USING (public.usuario_pertence_slug(slug))
WITH CHECK (public.usuario_pertence_slug(slug));

-- Anon não tem policy: cardápio público lê via API sanitizada (service role no servidor)
