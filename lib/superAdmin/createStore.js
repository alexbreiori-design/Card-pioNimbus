import { DEFAULT_ADMIN_DATA } from '@/lib/adminData';
import { normalizeSlug } from '@/lib/normalize';
import { generateTempPassword, isValidStoreSlug } from '@/lib/superAdmin';
import { findAuthUserByEmail } from '@/lib/superAdmin/authUsers';
import { buildStoreStateForCreate } from '@/lib/superAdmin/cloneFromModel';
import { upsertStoreStateServer } from '@/lib/supabase/storeStateServer';

export function buildInitialMenuStoreState({ slug, nome, telefone, segmento, cidade }) {
  return {
    loja: {
      ...DEFAULT_ADMIN_DATA.loja,
      slug,
      nome,
      telefone: telefone || '',
      whatsapp: telefone || '',
      segmento: segmento || '',
      enderecoCidade: cidade || '',
      endereco: cidade || '',
      aberta: true,
      fechadaManual: false,
    },
    categorias: [],
    produtos: [],
    adicionaisCategorias: [],
    adicionaisItens: [],
    promocoes: [],
    cupons: [],
    clientes: [],
    pedidos: [],
  };
}

/**
 * Cria loja + estado do cardápio + vínculo do proprietário.
 * @returns {{ empresa, ownerUserId, createdAuthUser, tempPassword }}
 */
export async function createStoreForSuperAdmin(supabase, input) {
  const slug = normalizeSlug(input.slug);
  const nome = String(input.nome || '').trim();
  const ownerEmail = String(input.ownerEmail || '')
    .trim()
    .toLowerCase();
  const ownerName = String(input.ownerName || nome || '').trim();
  const telefone = String(input.telefone || '').trim();
  const cidade = String(input.cidade || '').trim();
  const segmento = String(input.segmento || '').trim();
  const secondUnit = Boolean(input.secondUnit);
  const goLiveDate = input.goLiveDate ? String(input.goLiveDate).trim() : null;
  const cloneFromModel = Boolean(input.cloneFromModel);

  if (!isValidStoreSlug(slug)) {
    throw Object.assign(new Error('Slug inválido. Use letras minúsculas, números e hífens (2–48 caracteres).'), {
      status: 400,
    });
  }
  if (!nome) {
    throw Object.assign(new Error('Informe o nome fantasia da loja.'), { status: 400 });
  }
  if (!ownerEmail || !ownerEmail.includes('@')) {
    throw Object.assign(new Error('Informe o e-mail do proprietário.'), { status: 400 });
  }

  const { data: slugTaken, error: slugError } = await supabase
    .from('empresas')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (slugError) throw slugError;
  if (slugTaken?.id) {
    throw Object.assign(new Error('Este slug já está em uso. Escolha outro.'), { status: 409 });
  }

  let ownerUser = await findAuthUserByEmail(supabase, ownerEmail);
  let createdAuthUser = false;
  let tempPassword = null;

  if (!ownerUser) {
    if (secondUnit) {
      throw Object.assign(
        new Error('E-mail não encontrado no Auth. Desmarque "2ª unidade" para criar uma conta nova.'),
        { status: 400 }
      );
    }
    tempPassword = String(input.tempPassword || '').trim() || generateTempPassword();
    if (tempPassword.length < 8) {
      throw Object.assign(new Error('A senha temporária deve ter pelo menos 8 caracteres.'), { status: 400 });
    }

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: ownerEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { nome: ownerName },
    });
    if (createError) {
      throw Object.assign(new Error(createError.message || 'Não foi possível criar o usuário.'), {
        status: 400,
      });
    }
    ownerUser = created.user;
    createdAuthUser = true;
  } else if (!secondUnit && input.tempPassword) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(ownerUser.id, {
      password: String(input.tempPassword).trim(),
    });
    if (updateError) {
      throw Object.assign(new Error(updateError.message || 'Não foi possível atualizar a senha.'), {
        status: 400,
      });
    }
    tempPassword = String(input.tempPassword).trim();
  }

  const empresaPayload = {
    slug,
    nome,
    telefone: telefone || null,
    email: ownerEmail,
    endereco_cidade: cidade || null,
    segmento: segmento || null,
    aberta: true,
    updated_at: new Date().toISOString(),
  };

  empresaPayload.compartilha_metricas_nimbus = true;
  empresaPayload.metricas_consentimento_em = new Date().toISOString();
  if (goLiveDate) {
    empresaPayload.data_go_live = goLiveDate;
  }

  let empresa = null;
  let empresaError = null;
  ({ data: empresa, error: empresaError } = await supabase
    .from('empresas')
    .insert(empresaPayload)
    .select('id, slug, nome, aberta, endereco_cidade, segmento, created_at')
    .single());

  if (empresaError?.message?.includes('compartilha_metricas_nimbus')) {
    const {
      compartilha_metricas_nimbus: _c,
      metricas_consentimento_em: _m,
      data_go_live,
      ...basePayload
    } = empresaPayload;
    ({ data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .insert(basePayload)
      .select('id, slug, nome, aberta, endereco_cidade, segmento, created_at')
      .single());
  }
  if (empresaError) throw empresaError;

  const storeState = await buildStoreStateForCreate(supabase, {
    slug,
    nome,
    telefone,
    segmento,
    cidade,
    cloneFromModel,
  });
  await upsertStoreStateServer(slug, storeState);

  const { error: perfilError } = await supabase.from('perfis').upsert(
    {
      id: ownerUser.id,
      nome: ownerName,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  if (perfilError) throw perfilError;

  const { error: membroError } = await supabase.from('empresa_membros').upsert(
    {
      empresa_id: empresa.id,
      usuario_id: ownerUser.id,
      papel: 'proprietario',
      ativo: true,
    },
    { onConflict: 'empresa_id,usuario_id' }
  );
  if (membroError) throw membroError;

  return {
    empresa,
    ownerUserId: ownerUser.id,
    ownerEmail,
    createdAuthUser,
    tempPassword: createdAuthUser ? tempPassword : null,
  };
}
