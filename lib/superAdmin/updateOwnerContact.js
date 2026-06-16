import { findAuthUserByEmail } from '@/lib/superAdmin/authUsers';
import { findOwnerUserId } from '@/lib/superAdmin/ownerLookup';
import { normalizeSlug } from '@/lib/normalize';
import { fetchStoreStateBySlugServer, upsertStoreStateServer } from '@/lib/supabase/storeStateServer';

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizePhone(value) {
  return String(value || '').trim();
}

export async function updateStoreOwnerContact(supabase, slug, { email, telefone } = {}) {
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) {
    throw Object.assign(new Error('Slug inválido.'), { status: 400 });
  }

  const hasEmail = email !== undefined;
  const hasTelefone = telefone !== undefined;
  if (!hasEmail && !hasTelefone) {
    throw Object.assign(new Error('Informe e-mail ou telefone para atualizar.'), { status: 400 });
  }

  const { empresaId, userId } = await findOwnerUserId(supabase, safeSlug);
  const updates = { updated_at: new Date().toISOString() };

  if (hasEmail) {
    const nextEmail = normalizeEmail(email);
    if (!nextEmail || !nextEmail.includes('@')) {
      throw Object.assign(new Error('Informe um e-mail válido.'), { status: 400 });
    }

    const { data: currentAuth } = await supabase.auth.admin.getUserById(userId);
    const currentEmail = normalizeEmail(currentAuth?.user?.email);
    if (nextEmail !== currentEmail) {
      const taken = await findAuthUserByEmail(supabase, nextEmail);
      if (taken && taken.id !== userId) {
        throw Object.assign(new Error('Este e-mail já está em uso por outra conta.'), { status: 409 });
      }

      const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
        email: nextEmail,
        email_confirm: true,
      });
      if (authError) {
        throw Object.assign(new Error(authError.message || 'Não foi possível atualizar o e-mail.'), {
          status: 400,
        });
      }
    }
    updates.email = nextEmail;
  }

  if (hasTelefone) {
    updates.telefone = normalizePhone(telefone) || null;
  }

  if (Object.keys(updates).length > 1) {
    const { error: empresaError } = await supabase
      .from('empresas')
      .update(updates)
      .eq('id', empresaId);
    if (empresaError) throw empresaError;
  }

  if (hasTelefone) {
    const row = await fetchStoreStateBySlugServer(safeSlug);
    const state = row?.data || { loja: {} };
    const loja = state.loja || {};
    const nextPhone = normalizePhone(telefone);

    await upsertStoreStateServer(safeSlug, {
      ...state,
      loja: {
        ...loja,
        telefone: nextPhone,
        whatsapp: nextPhone || loja.whatsapp || '',
      },
    });
  }

  const { data: authUser } = await supabase.auth.admin.getUserById(userId);
  const { data: empresa } = await supabase
    .from('empresas')
    .select('email, telefone')
    .eq('id', empresaId)
    .maybeSingle();

  return {
    email: authUser?.user?.email || empresa?.email || null,
    telefone: empresa?.telefone || null,
  };
}
