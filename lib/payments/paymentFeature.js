function isMissingFeatureColumn(error) {
  return String(error?.message || '').includes('pagamentos_online_habilitados');
}

export async function isPaymentFeatureEnabledForEmpresa(supabase, empresaId) {
  if (!supabase || !empresaId) return false;

  const { data, error } = await supabase
    .from('empresas')
    .select('pagamentos_online_habilitados')
    .eq('id', empresaId)
    .maybeSingle();

  if (error) {
    if (isMissingFeatureColumn(error)) return false;
    throw error;
  }
  return data?.pagamentos_online_habilitados === true;
}

export async function requirePaymentFeatureForEmpresa(supabase, empresaId) {
  const enabled = await isPaymentFeatureEnabledForEmpresa(supabase, empresaId);
  if (!enabled) {
    throw Object.assign(new Error('Pagamentos online não estão liberados para esta loja.'), {
      status: 403,
    });
  }
}
