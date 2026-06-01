-- Vincular usuário Auth → loja nimbus-burger
-- Usuário: agenciageardesign@gmail.com
-- UID:     1d985ad6-fcae-4871-a8c0-47ba6063c9ed

DO $$
DECLARE
  v_usuario_id UUID := '1d985ad6-fcae-4871-a8c0-47ba6063c9ed';
  v_usuario_email TEXT := 'agenciageardesign@gmail.com';
  v_slug TEXT := 'nimbus-burger';
  v_nome TEXT := 'Agência Gear Design';
  v_papel membro_papel := 'proprietario';
  v_empresa_id UUID;
  v_resolved_user UUID;
BEGIN
  SELECT id INTO v_empresa_id
  FROM public.empresas
  WHERE slug = v_slug
  LIMIT 1;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Empresa não encontrada para slug: %', v_slug;
  END IF;

  SELECT id INTO v_resolved_user
  FROM auth.users
  WHERE id = v_usuario_id
     OR lower(email) = lower(v_usuario_email)
  LIMIT 1;

  IF v_resolved_user IS NULL THEN
    RAISE EXCEPTION
      'Usuário não encontrado (uid=% / email=%). Confira em Authentication → Users.',
      v_usuario_id, v_usuario_email;
  END IF;

  INSERT INTO public.perfis (id, nome)
  VALUES (v_resolved_user, v_nome)
  ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, updated_at = now();

  INSERT INTO public.empresa_membros (empresa_id, usuario_id, papel, ativo)
  VALUES (v_empresa_id, v_resolved_user, v_papel, true)
  ON CONFLICT (empresa_id, usuario_id) DO UPDATE
  SET papel = EXCLUDED.papel, ativo = true;

  RAISE NOTICE 'OK — usuario_id=%, email=%, empresa_id=%, slug=%',
    v_resolved_user, v_usuario_email, v_empresa_id, v_slug;
END $$;

-- Conferir vínculo
SELECT
  e.slug,
  e.nome AS loja,
  u.id AS usuario_id,
  u.email,
  p.nome AS perfil,
  em.papel,
  em.ativo
FROM public.empresa_membros em
JOIN public.empresas e ON e.id = em.empresa_id
JOIN auth.users u ON u.id = em.usuario_id
LEFT JOIN public.perfis p ON p.id = em.usuario_id
WHERE u.id = '1d985ad6-fcae-4871-a8c0-47ba6063c9ed';
