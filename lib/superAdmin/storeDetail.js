import { getSiteOrigin, getStorePublicUrl } from '@/lib/siteUrl';
import { isModelStoreSlug } from '@/lib/superAdmin/modelStore';
import { resolveOwnerPhone, buildOwnerWhatsAppUrl } from '@/lib/superAdmin/ownerContact';
import { computeDailySeries, computeGoLiveComparison } from '@/lib/superAdmin/metricsCompare';
import { resolveStoreActivityStatus } from '@/lib/superAdmin/storeActivity';
import { loadStoreTeam } from '@/lib/superAdmin/storeTeam';
import { loadAssembledStoreState } from '@/lib/catalog/storeCatalogRepository';
import { normalizeSlug } from '@/lib/normalize';
import { normalizeCardapioPublicVersion, CARDAPIO_PUBLIC_VERSION_V1 } from '@/lib/cardapioPublicVersion';
import { getStoreMetrics as fetchMetrics } from '@/lib/superAdmin/storeMetrics';

const EMPRESA_DETAIL_SELECT =
  'id, slug, nome, telefone, email, endereco_cidade, segmento, aberta, created_at, logo_url, data_go_live, notas_nimbus, suspensa, suspensa_em, responsavel_nimbus, contrato_inicio, contrato_fim, cardapio_publico_versao';
const EMPRESA_DETAIL_FALLBACK =
  'id, slug, nome, telefone, email, endereco_cidade, segmento, aberta, created_at, logo_url, data_go_live, notas_nimbus';

async function findOwnerMember(supabase, empresaId) {
  const { data: membros, error } = await supabase
    .from('empresa_membros')
    .select('usuario_id, papel, ativo')
    .eq('empresa_id', empresaId)
    .eq('ativo', true)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const proprietario =
    (membros || []).find((row) => row.papel === 'proprietario') || (membros || [])[0];
  if (!proprietario?.usuario_id) {
    return { ownerUserId: null, ownerName: null, ownerEmail: null, members: membros || [] };
  }

  const [{ data: perfil }, authUser] = await Promise.all([
    supabase.from('perfis').select('nome').eq('id', proprietario.usuario_id).maybeSingle(),
    supabase.auth.admin.getUserById(proprietario.usuario_id),
  ]);

  return {
    ownerUserId: proprietario.usuario_id,
    ownerName: perfil?.nome || null,
    ownerEmail: authUser?.data?.user?.email || null,
    members: membros || [],
  };
}

export async function loadStoreDetail(supabase, slug) {
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) return null;

  let empresa = null;
  let empresaError = null;
  ({ data: empresa, error: empresaError } = await supabase
    .from('empresas')
    .select(EMPRESA_DETAIL_SELECT)
    .eq('slug', safeSlug)
    .maybeSingle());

  if (
    empresaError?.message?.includes('notas_nimbus') ||
    empresaError?.message?.includes('suspensa') ||
    empresaError?.message?.includes('contrato_') ||
    empresaError?.message?.includes('cardapio_publico_versao')
  ) {
    ({ data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select(EMPRESA_DETAIL_FALLBACK)
      .eq('slug', safeSlug)
      .maybeSingle());
    if (empresa) {
      empresa.notas_nimbus = empresa.notas_nimbus ?? null;
      empresa.suspensa = false;
      empresa.suspensa_em = null;
      empresa.responsavel_nimbus = null;
      empresa.contrato_inicio = null;
      empresa.contrato_fim = null;
      empresa.cardapio_publico_versao = CARDAPIO_PUBLIC_VERSION_V1;
    }
  }
  if (empresaError) throw empresaError;
  if (!empresa?.id) return null;

  const [assembledState, owner, metricPack, team, pedidosRows] = await Promise.all([
    loadAssembledStoreState(supabase, safeSlug),
    findOwnerMember(supabase, empresa.id),
    fetchMetrics(supabase, empresa.id),
    loadStoreTeam(supabase, empresa.id),
    supabase
      .from('pedidos')
      .select('empresa_id, total, created_at')
      .eq('empresa_id', empresa.id)
      .eq('origem', 'cardapio_online')
      .neq('status', 'cancelado')
      .then(({ data, error }) => {
        if (error) throw error;
        return data || [];
      }),
  ]);

  const loja = assembledState?.data?.loja || {};
  const ownerPhone = resolveOwnerPhone({
    empresaTelefone: empresa.telefone,
    lojaTelefone: loja.telefone,
    lojaWhatsapp: loja.whatsapp,
  });

  const origin = getSiteOrigin();
  const activityStatus = resolveStoreActivityStatus({
    createdAt: empresa.created_at,
    lastPedidoAt: metricPack.lastPedidoAt,
  });

  return {
    id: empresa.id,
    slug: empresa.slug,
    isModel: isModelStoreSlug(empresa.slug),
    nome: empresa.nome,
    endereco_cidade: empresa.endereco_cidade,
    segmento: empresa.segmento,
    aberta: empresa.aberta,
    fechadaManual: Boolean(loja.fechadaManual),
    created_at: empresa.created_at,
    data_go_live: empresa.data_go_live,
    notas_nimbus: empresa.notas_nimbus || '',
    suspensa: Boolean(empresa.suspensa),
    suspensa_em: empresa.suspensa_em || null,
    responsavel_nimbus: empresa.responsavel_nimbus || '',
    contrato_inicio: empresa.contrato_inicio || null,
    contrato_fim: empresa.contrato_fim || null,
    logoUrl: loja.logoUrl || loja.logo_url || empresa.logo_url || null,
    activityStatus,
    catalogUpdatedAt: assembledState?.updated_at || null,
    cardapioUrl: getStorePublicUrl(empresa.slug),
    cardapio_publico_versao: normalizeCardapioPublicVersion(empresa.cardapio_publico_versao),
    loginUrl: `${origin}/login`,
    adminUrl: `${origin}/admin/pedidos`,
    owner: {
      userId: owner.ownerUserId || null,
      name: owner.ownerName || loja.nome || empresa.nome,
      email: owner.ownerEmail || empresa.email || null,
      phone: ownerPhone || null,
      whatsappUrl: ownerPhone ? buildOwnerWhatsAppUrl(ownerPhone) : null,
    },
    memberCount: owner.members.length,
    metrics: metricPack.metrics,
    lastPedidoAt: metricPack.lastPedidoAt,
    goLiveComparison: computeGoLiveComparison(pedidosRows, empresa.data_go_live),
    dailySeries: computeDailySeries(pedidosRows, 30),
    team,
  };
}

export async function updateStoreFields(supabase, slug, fields) {
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) {
    throw Object.assign(new Error('Slug inválido.'), { status: 400 });
  }

  const updates = { updated_at: new Date().toISOString() };
  if (fields.data_go_live !== undefined) {
    updates.data_go_live = fields.data_go_live || null;
  }
  if (fields.notas_nimbus !== undefined) {
    updates.notas_nimbus = String(fields.notas_nimbus || '').trim() || null;
  }
  if (fields.responsavel_nimbus !== undefined) {
    updates.responsavel_nimbus = String(fields.responsavel_nimbus || '').trim() || null;
  }
  if (fields.contrato_inicio !== undefined) {
    updates.contrato_inicio = fields.contrato_inicio || null;
  }
  if (fields.contrato_fim !== undefined) {
    updates.contrato_fim = fields.contrato_fim || null;
  }
  if (Object.keys(updates).length <= 1) {
    throw Object.assign(new Error('Nenhuma alteração informada.'), { status: 400 });
  }

  let result = await supabase
    .from('empresas')
    .update(updates)
    .eq('slug', safeSlug)
    .select('slug, data_go_live, notas_nimbus, responsavel_nimbus, contrato_inicio, contrato_fim')
    .maybeSingle();

  if (
    result.error?.message?.includes('notas_nimbus') ||
    result.error?.message?.includes('contrato_') ||
    result.error?.message?.includes('responsavel_nimbus')
  ) {
    const {
      notas_nimbus: _n,
      responsavel_nimbus: _r,
      contrato_inicio: _ci,
      contrato_fim: _cf,
      ...withoutCrm
    } = updates;
    if (fields.data_go_live === undefined && Object.keys(withoutCrm).length <= 1) {
      throw Object.assign(new Error('Rode a migration 012 para salvar campos de CRM.'), { status: 400 });
    }
    result = await supabase
      .from('empresas')
      .update(withoutCrm)
      .eq('slug', safeSlug)
      .select('slug, data_go_live')
      .maybeSingle();
    if (result.data) {
      result.data.notas_nimbus = null;
      result.data.responsavel_nimbus = null;
      result.data.contrato_inicio = null;
      result.data.contrato_fim = null;
    }
  }

  if (result.error) throw result.error;
  if (!result.data) {
    throw Object.assign(new Error('Loja não encontrada.'), { status: 404 });
  }
  return result.data;
}
