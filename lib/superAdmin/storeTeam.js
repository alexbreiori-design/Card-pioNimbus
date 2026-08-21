import { generateTempPassword } from '@/lib/superAdmin';
import { findAuthUserByEmail } from '@/lib/superAdmin/authUsers';

const PAPEL_LABELS = {
  proprietario: 'Proprietário',
  gerente: 'Gerente',
  atendente: 'Atendente',
};

export function memberRoleLabel(papel) {
  return PAPEL_LABELS[papel] || papel || 'Membro';
}

export async function loadStoreTeam(supabase, empresaId) {
  const { data: membros, error } = await supabase
    .from('empresa_membros')
    .select('id, usuario_id, papel, ativo, created_at')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const rows = membros || [];
  if (!rows.length) return [];

  const userIds = rows.map((row) => row.usuario_id);
  const [{ data: perfis }, authUsers] = await Promise.all([
    supabase.from('perfis').select('id, nome').in('id', userIds),
    Promise.all(userIds.map((id) => supabase.auth.admin.getUserById(id))),
  ]);

  const nomeById = new Map((perfis || []).map((row) => [row.id, row.nome]));
  const emailById = new Map();
  authUsers.forEach((result) => {
    const user = result?.data?.user;
    if (user?.id) emailById.set(user.id, user.email || null);
  });

  return rows.map((row) => ({
    id: row.id,
    usuarioId: row.usuario_id,
    papel: row.papel,
    papelLabel: memberRoleLabel(row.papel),
    ativo: row.ativo,
    nome: nomeById.get(row.usuario_id) || null,
    email: emailById.get(row.usuario_id) || null,
    created_at: row.created_at,
  }));
}

export async function addStoreTeamMember(supabase, { empresaId, email, papel, nome, tempPassword }) {
  const ownerEmail = String(email || '')
    .trim()
    .toLowerCase();
  const safePapel = ['gerente', 'atendente'].includes(papel) ? papel : 'atendente';
  const displayName = String(nome || '').trim();

  if (!ownerEmail || !ownerEmail.includes('@')) {
    throw Object.assign(new Error('Informe um e-mail válido.'), { status: 400 });
  }

  let user = await findAuthUserByEmail(supabase, ownerEmail);
  let createdAuthUser = false;
  let issuedPassword = null;

  if (!user) {
    issuedPassword = String(tempPassword || '').trim() || generateTempPassword();
    if (issuedPassword.length < 8) {
      throw Object.assign(new Error('A senha temporária deve ter pelo menos 8 caracteres.'), {
        status: 400,
      });
    }

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: ownerEmail,
      password: issuedPassword,
      email_confirm: true,
      user_metadata: { nome: displayName || ownerEmail },
    });
    if (createError) {
      throw Object.assign(new Error(createError.message || 'Não foi possível criar o usuário.'), {
        status: 400,
      });
    }
    user = created.user;
    createdAuthUser = true;
  }

  if (displayName) {
    const { error: perfilError } = await supabase.from('perfis').upsert(
      {
        id: user.id,
        nome: displayName,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (perfilError) throw perfilError;
  }

  const { data: membro, error: membroError } = await supabase
    .from('empresa_membros')
    .upsert(
      {
        empresa_id: empresaId,
        usuario_id: user.id,
        papel: safePapel,
        ativo: true,
      },
      { onConflict: 'empresa_id,usuario_id' }
    )
    .select('id, usuario_id, papel, ativo, created_at')
    .single();
  if (membroError) throw membroError;

  return {
    membro,
    createdAuthUser,
    tempPassword: createdAuthUser ? issuedPassword : null,
    email: ownerEmail,
  };
}

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

async function getMembershipRow(supabase, empresaId, usuarioId) {
  const { data, error } = await supabase
    .from('empresa_membros')
    .select('id, usuario_id, papel, ativo, created_at')
    .eq('empresa_id', empresaId)
    .eq('usuario_id', usuarioId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw Object.assign(new Error('Membro não encontrado nesta loja.'), { status: 404 });
  }
  return data;
}

async function countStoreMembers(supabase, empresaId) {
  const { count, error } = await supabase
    .from('empresa_membros')
    .select('id', { count: 'exact', head: true })
    .eq('empresa_id', empresaId);
  if (error) throw error;
  return count ?? 0;
}

async function promoteNextOwner(supabase, empresaId, excludeUsuarioId) {
  const { data: candidates, error } = await supabase
    .from('empresa_membros')
    .select('usuario_id, papel, ativo, created_at')
    .eq('empresa_id', empresaId)
    .neq('usuario_id', excludeUsuarioId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const next =
    (candidates || []).find((row) => row.ativo && row.papel === 'proprietario') ||
    (candidates || []).find((row) => row.ativo) ||
    (candidates || [])[0];
  if (!next?.usuario_id) return null;

  if (next.papel !== 'proprietario') {
    const { error: promoteError } = await supabase
      .from('empresa_membros')
      .update({ papel: 'proprietario', ativo: true })
      .eq('empresa_id', empresaId)
      .eq('usuario_id', next.usuario_id);
    if (promoteError) throw promoteError;
  } else if (!next.ativo) {
    const { error: activateError } = await supabase
      .from('empresa_membros')
      .update({ ativo: true })
      .eq('empresa_id', empresaId)
      .eq('usuario_id', next.usuario_id);
    if (activateError) throw activateError;
  }

  const { data: authUser } = await supabase.auth.admin.getUserById(next.usuario_id);
  const nextEmail = normalizeEmail(authUser?.user?.email);
  if (nextEmail) {
    const { error: empresaError } = await supabase
      .from('empresas')
      .update({ email: nextEmail, updated_at: new Date().toISOString() })
      .eq('id', empresaId);
    if (empresaError) throw empresaError;
  }

  return next.usuario_id;
}

export async function updateStoreTeamMember(
  supabase,
  { empresaId, usuarioId, papel, ativo, email, nome, password }
) {
  const membership = await getMembershipRow(supabase, empresaId, usuarioId);
  const membershipUpdates = {};
  let issuedPassword = null;

  if (papel && ['proprietario', 'gerente', 'atendente'].includes(papel)) {
    if (membership.papel === 'proprietario' && papel !== 'proprietario') {
      const total = await countStoreMembers(supabase, empresaId);
      if (total <= 1) {
        throw Object.assign(
          new Error('Não é possível alterar o papel do único membro da loja.'),
          { status: 400 }
        );
      }
      await promoteNextOwner(supabase, empresaId, usuarioId);
    }
    if (papel === 'proprietario' && membership.papel !== 'proprietario') {
      const { error: demoteError } = await supabase
        .from('empresa_membros')
        .update({ papel: 'gerente' })
        .eq('empresa_id', empresaId)
        .eq('papel', 'proprietario')
        .neq('usuario_id', usuarioId);
      if (demoteError) throw demoteError;
    }
    membershipUpdates.papel = papel;
  }

  if (typeof ativo === 'boolean') {
    if (ativo === false) {
      const { count: activeCount, error: activeError } = await supabase
        .from('empresa_membros')
        .select('id', { count: 'exact', head: true })
        .eq('empresa_id', empresaId)
        .eq('ativo', true);
      if (activeError) throw activeError;
      if ((activeCount ?? 0) <= 1 && membership.ativo) {
        throw Object.assign(
          new Error('Não é possível desativar o único membro ativo da loja.'),
          { status: 400 }
        );
      }
    }
    membershipUpdates.ativo = ativo;
  }

  if (email !== undefined) {
    const nextEmail = normalizeEmail(email);
    if (!nextEmail || !nextEmail.includes('@')) {
      throw Object.assign(new Error('Informe um e-mail válido.'), { status: 400 });
    }

    const { data: currentAuth } = await supabase.auth.admin.getUserById(usuarioId);
    const currentEmail = normalizeEmail(currentAuth?.user?.email);
    if (nextEmail !== currentEmail) {
      const taken = await findAuthUserByEmail(supabase, nextEmail);
      if (taken && taken.id !== usuarioId) {
        throw Object.assign(new Error('Este e-mail já está em uso por outra conta.'), {
          status: 409,
        });
      }

      const { error: authError } = await supabase.auth.admin.updateUserById(usuarioId, {
        email: nextEmail,
        email_confirm: true,
      });
      if (authError) {
        throw Object.assign(new Error(authError.message || 'Não foi possível atualizar o e-mail.'), {
          status: 400,
        });
      }
    }

    const effectivePapel = membershipUpdates.papel || membership.papel;
    if (effectivePapel === 'proprietario') {
      const { error: empresaError } = await supabase
        .from('empresas')
        .update({ email: nextEmail, updated_at: new Date().toISOString() })
        .eq('id', empresaId);
      if (empresaError) throw empresaError;
    }
  }

  if (nome !== undefined) {
    const displayName = String(nome || '').trim();
    const { error: perfilError } = await supabase.from('perfis').upsert(
      {
        id: usuarioId,
        nome: displayName || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (perfilError) throw perfilError;
  }

  if (password !== undefined) {
    const nextPassword = String(password || '').trim();
    if (nextPassword.length < 8) {
      throw Object.assign(new Error('A senha deve ter pelo menos 8 caracteres.'), { status: 400 });
    }
    const { error: passwordError } = await supabase.auth.admin.updateUserById(usuarioId, {
      password: nextPassword,
    });
    if (passwordError) {
      throw Object.assign(new Error(passwordError.message || 'Não foi possível atualizar a senha.'), {
        status: 400,
      });
    }
    issuedPassword = nextPassword;
  }

  if (!Object.keys(membershipUpdates).length && email === undefined && nome === undefined && password === undefined) {
    throw Object.assign(new Error('Nenhuma alteração informada.'), { status: 400 });
  }

  if (!Object.keys(membershipUpdates).length) {
    return { ...membership, tempPassword: issuedPassword };
  }

  const { data, error } = await supabase
    .from('empresa_membros')
    .update(membershipUpdates)
    .eq('empresa_id', empresaId)
    .eq('usuario_id', usuarioId)
    .select('id, usuario_id, papel, ativo, created_at')
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw Object.assign(new Error('Membro não encontrado nesta loja.'), { status: 404 });
  }
  return { ...data, tempPassword: issuedPassword };
}

export async function removeStoreTeamMember(supabase, { empresaId, usuarioId }) {
  const membership = await getMembershipRow(supabase, empresaId, usuarioId);
  const total = await countStoreMembers(supabase, empresaId);
  if (total <= 1) {
    throw Object.assign(
      new Error('Não é possível remover o único membro da loja. Adicione outra pessoa antes.'),
      { status: 400 }
    );
  }

  if (membership.papel === 'proprietario') {
    await promoteNextOwner(supabase, empresaId, usuarioId);
  }

  const { error: deleteError } = await supabase
    .from('empresa_membros')
    .delete()
    .eq('empresa_id', empresaId)
    .eq('usuario_id', usuarioId);
  if (deleteError) throw deleteError;

  const { count: otherMemberships, error: otherError } = await supabase
    .from('empresa_membros')
    .select('id', { count: 'exact', head: true })
    .eq('usuario_id', usuarioId);
  if (otherError) throw otherError;

  let deletedAuthUser = false;
  if ((otherMemberships ?? 0) === 0) {
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(usuarioId);
    if (authDeleteError) {
      throw Object.assign(
        new Error(authDeleteError.message || 'Membro removido da loja, mas a conta Auth não foi apagada.'),
        { status: 400 }
      );
    }
    deletedAuthUser = true;
  }

  return { deletedAuthUser };
}
