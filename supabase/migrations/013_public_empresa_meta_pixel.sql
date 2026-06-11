-- Expõe meta_pixel_id no RPC público do cardápio (campo não sensível; necessário para rastreamento).
CREATE OR REPLACE FUNCTION public.get_public_empresa_cardapio(store_slug TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', e.id,
    'slug', e.slug,
    'nome', e.nome,
    'cor_marca', e.cor_marca,
    'telefone', e.telefone,
    'segmento', e.segmento,
    'meta_pixel_id', e.meta_pixel_id,
    'latitude', e.latitude,
    'longitude', e.longitude,
    'endereco_logradouro', e.endereco_logradouro,
    'endereco_numero', e.endereco_numero,
    'endereco_bairro', e.endereco_bairro,
    'endereco_cidade', e.endereco_cidade,
    'endereco_estado', e.endereco_estado,
    'endereco_cep', e.endereco_cep
  )
  FROM public.empresas e
  WHERE e.slug = store_slug
    AND e.aberta = true
    AND COALESCE(e.suspensa, false) = false
  LIMIT 1;
$$;
