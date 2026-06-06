const PROFILE_ID = 1;

export async function loadSystemProfile(supabase) {
  const { data, error } = await supabase
    .from('nimbus_perfil_sistema')
    .select('nome_exibicao, whatsapp_suporte, email, updated_at')
    .eq('id', PROFILE_ID)
    .maybeSingle();

  if (error?.message?.includes('nimbus_perfil_sistema')) {
    return {
      nome_exibicao: 'Nimbus',
      whatsapp_suporte: null,
      email: null,
      updated_at: null,
    };
  }
  if (error) throw error;

  return {
    nome_exibicao: data?.nome_exibicao || 'Nimbus',
    whatsapp_suporte: data?.whatsapp_suporte || null,
    email: data?.email || null,
    updated_at: data?.updated_at || null,
  };
}

export async function updateSystemProfile(supabase, fields) {
  const updates = { id: PROFILE_ID, updated_at: new Date().toISOString() };

  if (fields.nome_exibicao !== undefined) {
    updates.nome_exibicao = String(fields.nome_exibicao || '').trim() || 'Nimbus';
  }
  if (fields.whatsapp_suporte !== undefined) {
    const raw = String(fields.whatsapp_suporte || '').trim();
    updates.whatsapp_suporte = raw || null;
  }
  if (fields.email !== undefined) {
    const raw = String(fields.email || '').trim();
    updates.email = raw || null;
  }

  if (Object.keys(updates).length <= 2) {
    throw Object.assign(new Error('Nenhuma alteração informada.'), { status: 400 });
  }

  const { data, error } = await supabase
    .from('nimbus_perfil_sistema')
    .upsert(updates, { onConflict: 'id' })
    .select('nome_exibicao, whatsapp_suporte, email, updated_at')
    .maybeSingle();

  if (error?.message?.includes('nimbus_perfil_sistema')) {
    throw Object.assign(new Error('Rode a migration 012 para salvar o perfil do sistema.'), { status: 400 });
  }
  if (error) throw error;
  return data;
}
