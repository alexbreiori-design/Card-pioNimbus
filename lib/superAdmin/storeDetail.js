import { getSiteOrigin, getStorePublicUrl } from '@/lib/siteUrl';
import { isValidStoreSlug } from '@/lib/superAdmin';
import { isModelStoreSlug } from '@/lib/superAdmin/modelStore';
import { renameStoreSlug, updateStoreSegmento } from '@/lib/superAdmin/renameStoreSlug';
import { resolveOwnerPhone, buildOwnerWhatsAppUrl } from '@/lib/superAdmin/ownerContact';
import { computeGoLiveComparison } from '@/lib/superAdmin/metricsCompare';
import { resolveStoreActivityStatus } from '@/lib/superAdmin/storeActivity';
import { loadStoreTeam } from '@/lib/superAdmin/storeTeam';
import { loadAssembledStoreState } from '@/lib/catalog/storeCatalogRepository';
import { normalizeSlug } from '@/lib/normalize';
import { normalizeCardapioPublicVersion, CARDAPIO_PUBLIC_VERSION_V1 } from '@/lib/cardapioPublicVersion';
import { mapAssinaturaRow, computeHealthScore } from '@/lib/stripe/assinaturas';
import {
  computeDailySeriesZoned,
  getStoreMetrics as fetchMetrics,
} from '@/lib/superAdmin/storeMetrics';

const EMPRESA_DETAIL_SELECT =
  'id, slug, nome, telefone, email, endereco_cidade, segmento, aberta, created_at, logo_url, data_go_live, notas_nimbus, suspensa, suspensa_em, suspensa_motivo, responsavel_nimbus, contrato_inicio, contrato_fim, cardapio_publico_versao, pagamentos_online_habilitados, assinatura_nimbus_habilitada';
const EMPRESA_DETAIL_FALLBACK =
  'id, slug, nome, telefone, email, endereco_cidade, segmento, aberta, created_at, logo_url, data_go_live, notas_nimbus';

async function loadAssinatura(supabase, empresaId) {
  try {
    const { data, error } = await supabase
      .from('empresa_assinaturas')
      .select('*')
      .eq('empresa_id', empresaId)
      .maybeSingle();
    if (error) throw error;
    return mapAssinaturaRow(data);
  } catch {
    return null;
  }
}

async function loadTimeline(supabase, empresaId) {
  try {
    const { data, error } = await supabase
      .from('empresa_timeline_eventos')
      .select('id, tipo, titulo, detalhe, meta, created_at')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
}

async function loadSuspensaoHistorico(supabase, empresaId) {
  try {
    const { data, error } = await supabase
      .from('empresa_suspensao_eventos')
      .select('id, acao, motivo, autor_email, created_at')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
}

async function loadOnboarding(supabase, empresaId) {
  try {
    const { data, error } = await supabase
      .from('empresa_onboarding')
      .select('tem_logo, tem_catalogo, tem_horarios, tem_go_live, tem_primeiro_pedido')
      .eq('empresa_id', empresaId)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  } catch {
    return null;
  }
}

function deriveOnboarding({ empresa, loja, lastPedidoAt, catalogUpdatedAt }) {
  const horarios = loja?.horarios || loja?.horario || null;
  const temHorarios = Boolean(
    (Array.isArray(horarios) && horarios.length) ||
      (horarios && typeof horarios === 'object' && Object.keys(horarios).length)
  );
  return {
    tem_logo: Boolean(loja?.logoUrl || loja?.logo_url || empresa?.logo_url),
    tem_catalogo: Boolean(catalogUpdatedAt),
    tem_horarios: temHorarios,
    tem_go_live: Boolean(empresa?.data_go_live),
    tem_primeiro_pedido: Boolean(lastPedidoAt),
  };
}

function computeOnboardingPct(onboarding) {
  if (!onboarding) return null;
  const flags = [
    onboarding.tem_logo,
    onboarding.tem_catalogo,
    onboarding.tem_horarios,
    onboarding.tem_go_live,
    onboarding.tem_primeiro_pedido,
  ];
  const done = flags.filter(Boolean).length;
  return Math.round((done / flags.length) * 100);
}

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
    empresaError?.message?.includes('cardapio_publico_versao') ||
    empresaError?.message?.includes('pagamentos_online_habilitados') ||
    empresaError?.message?.includes('assinatura_nimbus_habilitada')
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
      empresa.pagamentos_online_habilitados = false;
      empresa.assinatura_nimbus_habilitada = false;
    }
  }
  if (empresaError) throw empresaError;
  if (!empresa?.id) return null;

  const [assembledState, owner, metricPack, team, assinatura, timeline, suspensaoHistorico, onboarding] =
    await Promise.all([
      loadAssembledStoreState(supabase, safeSlug),
      findOwnerMember(supabase, empresa.id),
      fetchMetrics(supabase, empresa.id),
      loadStoreTeam(supabase, empresa.id),
      loadAssinatura(supabase, empresa.id),
      loadTimeline(supabase, empresa.id),
      loadSuspensaoHistorico(supabase, empresa.id),
      loadOnboarding(supabase, empresa.id),
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
  const onlinePedidos = (metricPack.pedidos || []).filter(
    (row) => row.origem === 'cardapio_online' && row.status !== 'cancelado'
  );

  const derivedOnboarding = deriveOnboarding({
    empresa,
    loja,
    lastPedidoAt: metricPack.lastPedidoAt,
    catalogUpdatedAt: assembledState?.updated_at || null,
  });
  const onboardingMerged = {
    ...derivedOnboarding,
    ...(onboarding || {}),
    tem_logo: Boolean(onboarding?.tem_logo || derivedOnboarding.tem_logo),
    tem_catalogo: Boolean(onboarding?.tem_catalogo || derivedOnboarding.tem_catalogo),
    tem_horarios: Boolean(onboarding?.tem_horarios || derivedOnboarding.tem_horarios),
    tem_go_live: Boolean(onboarding?.tem_go_live || derivedOnboarding.tem_go_live),
    tem_primeiro_pedido: Boolean(onboarding?.tem_primeiro_pedido || derivedOnboarding.tem_primeiro_pedido),
  };
  const onboardingPct = computeOnboardingPct(onboardingMerged);
  const healthScore = computeHealthScore({
    activityStatus,
    assinatura,
    feedbackAbertos: 0,
    onboardingPct,
    suspensa: Boolean(empresa.suspensa),
  });

  // Best-effort persist derived onboarding for HQ checklist.
  try {
    await supabase.from('empresa_onboarding').upsert(
      {
        empresa_id: empresa.id,
        ...onboardingMerged,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'empresa_id' }
    );
  } catch {
    // ignore
  }

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
    suspensa_motivo: empresa.suspensa_motivo || null,
    responsavel_nimbus: empresa.responsavel_nimbus || '',
    contrato_inicio: empresa.contrato_inicio || null,
    contrato_fim: empresa.contrato_fim || null,
    logoUrl: loja.logoUrl || loja.logo_url || empresa.logo_url || null,
    activityStatus,
    catalogUpdatedAt: assembledState?.updated_at || null,
    cardapioUrl: getStorePublicUrl(empresa.slug),
    cardapio_publico_versao: normalizeCardapioPublicVersion(empresa.cardapio_publico_versao),
    pagamentos_online_habilitados: Boolean(empresa.pagamentos_online_habilitados),
    assinatura_nimbus_habilitada: Boolean(empresa.assinatura_nimbus_habilitada),
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
    goLiveComparison: computeGoLiveComparison(onlinePedidos, empresa.data_go_live),
    dailySeries: computeDailySeriesZoned(metricPack.pedidos || [], 30),
    team,
    assinatura,
    timeline,
    suspensaoHistorico,
    onboarding: onboardingMerged,
    onboardingPct,
    healthScore,
  };
}

export async function updateStoreFields(supabase, slug, fields) {
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) {
    throw Object.assign(new Error('Slug inválido.'), { status: 400 });
  }

  let currentSlug = safeSlug;
  let segmentoResult = null;

  if (fields.segmento !== undefined) {
    segmentoResult = await updateStoreSegmento(supabase, currentSlug, fields.segmento);
  }

  if (fields.slug !== undefined) {
    const nextSlug = normalizeSlug(fields.slug);
    if (!nextSlug) {
      throw Object.assign(new Error('Slug inválido.'), { status: 400 });
    }
    if (!isValidStoreSlug(nextSlug)) {
      throw Object.assign(
        new Error('Slug inválido. Use letras minúsculas, números e hífens (2–48 caracteres).'),
        { status: 400 }
      );
    }
    if (nextSlug !== currentSlug) {
      const renamed = await renameStoreSlug(supabase, currentSlug, nextSlug);
      currentSlug = renamed.slug;
    }
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
  if (fields.pagamentos_online_habilitados !== undefined) {
    updates.pagamentos_online_habilitados = fields.pagamentos_online_habilitados === true;
  }
  if (fields.assinatura_nimbus_habilitada !== undefined) {
    updates.assinatura_nimbus_habilitada = fields.assinatura_nimbus_habilitada === true;
  }

  const hasCrmUpdates = Object.keys(updates).length > 1;
  const hasIdentityUpdates = fields.segmento !== undefined || fields.slug !== undefined;

  if (!hasCrmUpdates && !hasIdentityUpdates) {
    throw Object.assign(new Error('Nenhuma alteração informada.'), { status: 400 });
  }

  let result = { data: null, error: null };

  if (hasCrmUpdates) {
    result = await supabase
      .from('empresas')
      .update(updates)
      .eq('slug', currentSlug)
      .select('slug, segmento, data_go_live, notas_nimbus, responsavel_nimbus, contrato_inicio, contrato_fim, pagamentos_online_habilitados, assinatura_nimbus_habilitada')
      .maybeSingle();

    if (
      result.error?.message?.includes('notas_nimbus') ||
      result.error?.message?.includes('contrato_') ||
      result.error?.message?.includes('responsavel_nimbus') ||
      result.error?.message?.includes('pagamentos_online_habilitados') ||
      result.error?.message?.includes('assinatura_nimbus_habilitada')
    ) {
      if (result.error?.message?.includes('pagamentos_online_habilitados')) {
        throw Object.assign(
          new Error('Rode a migration da liberação de pagamentos para salvar esta opção.'),
          { status: 400 }
        );
      }
      if (result.error?.message?.includes('assinatura_nimbus_habilitada')) {
        throw Object.assign(
          new Error('Rode a migration da assinatura Nimbus para salvar esta opção.'),
          { status: 400 }
        );
      }
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
        .eq('slug', currentSlug)
        .select('slug, segmento, data_go_live')
        .maybeSingle();
      if (result.data) {
        result.data.notas_nimbus = null;
        result.data.responsavel_nimbus = null;
        result.data.contrato_inicio = null;
        result.data.contrato_fim = null;
        result.data.pagamentos_online_habilitados = false;
        result.data.assinatura_nimbus_habilitada = false;
      }
    }

    if (result.error) throw result.error;
    if (!result.data) {
      throw Object.assign(new Error('Loja não encontrada.'), { status: 404 });
    }
  } else {
    const { data, error } = await supabase
      .from('empresas')
      .select('slug, segmento, data_go_live, notas_nimbus, responsavel_nimbus, contrato_inicio, contrato_fim, pagamentos_online_habilitados, assinatura_nimbus_habilitada')
      .eq('slug', currentSlug)
      .maybeSingle();
    if (error) throw error;
    if (!data?.slug) {
      throw Object.assign(new Error('Loja não encontrada.'), { status: 404 });
    }
    result.data = data;
  }

  if (segmentoResult) {
    result.data.segmento = segmentoResult.segmento;
  }

  return {
    ...result.data,
    slug: currentSlug,
    previousSlug: currentSlug !== safeSlug ? safeSlug : undefined,
  };
}
