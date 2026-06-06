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

export async function updateStoreTeamMember(supabase, { empresaId, usuarioId, papel, ativo }) {
  const updates = {};
  if (papel && ['proprietario', 'gerente', 'atendente'].includes(papel)) {
    updates.papel = papel;
  }
  if (typeof ativo === 'boolean') {
    updates.ativo = ativo;
  }
  if (!Object.keys(updates).length) {
    throw Object.assign(new Error('Nenhuma alteração informada.'), { status: 400 });
  }

  const { data, error } = await supabase
    .from('empresa_membros')
    .update(updates)
    .eq('empresa_id', empresaId)
    .eq('usuario_id', usuarioId)
    .select('id, usuario_id, papel, ativo, created_at')
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw Object.assign(new Error('Membro não encontrado nesta loja.'), { status: 404 });
  }
  return data;
}
