'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import AdminAvailabilitySwitch from '@/components/admin/AdminAvailabilitySwitch';
import { useAdminOverlayClose } from '@/hooks/useAdminOverlayClose';
import AdminDatePicker from '@/components/admin/AdminDatePicker';
import { useAdminToast, TOAST_DURATION_MS } from '@/context/AdminToastContext';
import { activityStatusLabel } from '@/lib/superAdmin/storeActivity';
import { generateTempPassword } from '@/lib/superAdmin';
import { buildCardapioV2Path } from '@/lib/cardapioV2';
import { isCardapioPublicV2 } from '@/lib/cardapioPublicVersion';
import SegmentCombobox from '@/components/admin/SegmentCombobox';
import { getStorePublicHost, getStorePublicUrl } from '@/lib/siteUrl';
import { writeActiveStoreSlug } from '@/lib/adminStoreSession';
import StoreCatalogImportPanel from './StoreCatalogImportPanel';
import { NIMBUS_FEEDBACK_STATUS_LABEL } from '@/lib/nimbusFeedback';
import {
  SaFeedbackSkeleton,
  SaStoreDrawerHeroSkeleton,
  SaStoreDrawerSkeleton,
} from './SuperAdminSkeletons';
import styles from './StoreDetailModal.module.css';

const TABS = [
  { id: 'visao', label: 'Visão' },
  { id: 'metricas', label: 'Métricas' },
  { id: 'operacao', label: 'Operação' },
  { id: 'comercial', label: 'Comercial' },
  { id: 'pessoas', label: 'Pessoas' },
];

const ONBOARDING_ITEMS = [
  { key: 'tem_logo', label: 'Logo da loja' },
  { key: 'tem_catalogo', label: 'Catálogo cadastrado' },
  { key: 'tem_horarios', label: 'Horários configurados' },
  { key: 'tem_go_live', label: 'Go-live definido' },
  { key: 'tem_primeiro_pedido', label: 'Primeiro pedido recebido' },
];

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('pt-BR');
  } catch {
    return '—';
  }
}

function formatDateOnly(value) {
  if (!value) return '';
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  try {
    return new Date(value).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  } catch {
    return '';
  }
}

function todaySaoPauloClient() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

function daysBetweenDateOnly(inicio, fim) {
  const a = formatDateOnly(inicio);
  const b = formatDateOnly(fim);
  if (!a || !b) return null;
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / (24 * 60 * 60 * 1000));
}

function syncCarenciaDraftFromAssinatura(assinatura, setters) {
  const { setCarenciaEnabled, setCarenciaModo, setCarenciaInicio, setCarenciaFim } = setters;
  const active = assinatura?.statusLocal === 'cortesia';
  setCarenciaEnabled(active);
  const inicio = formatDateOnly(assinatura?.carenciaInicio) || '';
  const fim = formatDateOnly(assinatura?.carenciaFim) || '';
  setCarenciaInicio(inicio);
  setCarenciaFim(fim);
  if (!active) {
    setCarenciaModo('7dias');
    return;
  }
  const span = daysBetweenDateOnly(inicio, fim);
  setCarenciaModo(span === 7 ? '7dias' : 'personalizado');
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatCurrencyCents(value) {
  if (value === null || value === undefined) return '—';
  return formatCurrency(Number(value) / 100);
}

function StoreAvatar({ nome, logoUrl }) {
  const initial = String(nome || 'L').trim().charAt(0).toUpperCase() || 'L';
  if (logoUrl) {
    return (
      <div className={styles.avatar}>
        <img src={logoUrl} alt="" />
      </div>
    );
  }
  return <div className={styles.avatar}>{initial}</div>;
}

function DailyChart({ series }) {
  const maxPedidos = useMemo(
    () => Math.max(1, ...(series || []).map((row) => row.pedidos)),
    [series]
  );

  if (!series?.length) {
    return <p className={styles.muted}>Sem pedidos nos últimos 30 dias.</p>;
  }

  return (
    <div className={styles.chart} aria-label="Pedidos por dia nos últimos 30 dias">
      {series.map((row) => {
        const height = Math.round((row.pedidos / maxPedidos) * 100);
        const label = row.date.slice(5).replace('-', '/');
        const online = Number(row.online || 0);
        const balcao = Number(row.balcao || 0);
        const onlineShare = row.pedidos > 0 ? (online / row.pedidos) * 100 : 0;
        return (
          <div
            key={row.date}
            className={styles.chartBarWrap}
            title={`${label}: ${row.pedidos} pedido(s) · online ${online} · balcão ${balcao}`}
          >
            <div className={styles.chartBar} style={{ height: `${Math.max(height, row.pedidos ? 8 : 4)}%` }}>
              {row.pedidos > 0 ? (
                <span className={styles.chartBarOnline} style={{ height: `${onlineShare}%` }} />
              ) : null}
            </div>
            <span className={styles.chartLabel}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function MetricsDashboard({ metrics, dailySeries, compare }) {
  const [period, setPeriod] = useState('hoje');
  const [expanded, setExpanded] = useState(false);
  const current = metrics?.[period] || metrics?.hoje || {};
  const onlineShare =
    current.pedidos > 0 ? Math.round((current.online?.pedidos / current.pedidos) * 100) : 0;
  const balcaoShare =
    current.pedidos > 0 ? Math.round((current.balcao?.pedidos / current.pedidos) * 100) : 0;

  return (
    <div className={styles.metricsDashboard}>
      <div className={styles.metricsToolbar}>
        <p className={styles.metricsIntro}>
          Visão operacional da loja: cardápio online e balcão/admin, no fuso de São Paulo.
        </p>
        <div className={styles.periodTabs} role="tablist" aria-label="Período das métricas">
          {[
            { id: 'hoje', label: 'Hoje' },
            { id: 'd7', label: '7 dias' },
            { id: 'd30', label: '30 dias' },
            { id: 'total', label: 'Total' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={period === item.id}
              className={`${styles.periodTab}${period === item.id ? ` ${styles.periodTabActive}` : ''}`}
              onClick={() => setPeriod(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.kpiGrid}>
        <article className={`${styles.kpiCard} ${styles.kpiCardFeatured}`}>
          <span>Faturamento</span>
          <strong>{formatCurrency(current.faturamento)}</strong>
          <small>Ticket médio {formatCurrency(current.ticketMedio)}</small>
        </article>
        <article className={styles.kpiCard}>
          <span>Pedidos</span>
          <strong>{current.pedidos ?? 0}</strong>
          <small>{current.concluidos ?? 0} concluídos</small>
        </article>
        <article className={styles.kpiCard}>
          <span>Itens vendidos</span>
          <strong>{current.itens ?? 0}</strong>
          <small>Soma das quantidades</small>
        </article>
        <article className={styles.kpiCard}>
          <span>Em andamento</span>
          <strong>{current.emAndamento ?? 0}</strong>
          <small>{current.cancelados ?? 0} cancelados</small>
        </article>
      </div>

      <div className={styles.channelGrid}>
        <article className={`${styles.channelCard} ${styles.channelOnline}`}>
          <div className={styles.channelHead}>
            <span>Cardápio online</span>
            <strong>{onlineShare}%</strong>
          </div>
          <p className={styles.channelValue}>{current.online?.pedidos ?? 0} pedidos</p>
          <p className={styles.channelMoney}>{formatCurrency(current.online?.faturamento)}</p>
          <div className={styles.channelBarTrack}>
            <span className={styles.channelBarFill} style={{ width: `${onlineShare}%` }} />
          </div>
        </article>
        <article className={`${styles.channelCard} ${styles.channelBalcao}`}>
          <div className={styles.channelHead}>
            <span>Balcão / Admin</span>
            <strong>{balcaoShare}%</strong>
          </div>
          <p className={styles.channelValue}>{current.balcao?.pedidos ?? 0} pedidos</p>
          <p className={styles.channelMoney}>{formatCurrency(current.balcao?.faturamento)}</p>
          <div className={styles.channelBarTrack}>
            <span className={styles.channelBarFill} style={{ width: `${balcaoShare}%` }} />
          </div>
        </article>
      </div>

      <div className={styles.typeRow}>
        <div className={styles.typeChip}>
          <span>Delivery</span>
          <strong>{current.delivery ?? 0}</strong>
        </div>
        <div className={styles.typeChip}>
          <span>Retirada</span>
          <strong>{current.retirada ?? 0}</strong>
        </div>
        <div className={styles.typeChip}>
          <span>Balcão</span>
          <strong>{current.balcaoTipo ?? 0}</strong>
        </div>
      </div>

      <div className={styles.metricsToggleRow}>
        <button
          type="button"
          className={styles.metricsToggleBtn}
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? 'Ver menos' : 'Ver mais'}
        </button>
      </div>

      {expanded ? (
        <div className={styles.metricsSplit}>
          <section className={styles.sectionBlock}>
            <h3 className={styles.sectionHeading}>Comparativo go-live</h3>
            {compare?.hasGoLive ? (
              <div className={styles.compareRow}>
                <article className={styles.compareCard}>
                  <span>Antes do go-live</span>
                  <strong>{compare.antes?.pedidos ?? 0} pedidos</strong>
                  <p>{formatCurrency(compare.antes?.faturamento)}</p>
                </article>
                <span className={styles.compareArrow} aria-hidden="true">
                  →
                </span>
                <article className={`${styles.compareCard} ${styles.compareCardAfter}`}>
                  <span>Depois do go-live</span>
                  <strong>{compare.depois?.pedidos ?? 0} pedidos</strong>
                  <p>{formatCurrency(compare.depois?.faturamento)}</p>
                </article>
              </div>
            ) : (
              <p className={styles.muted}>
                Defina a data go-live na aba Comercial para comparar vendas online antes e depois
                do cardápio.
              </p>
            )}
            <p className={styles.metricsFootnote}>Go-live considera apenas pedidos do cardápio online.</p>
          </section>

          <section className={styles.sectionBlock}>
            <h3 className={styles.sectionHeading}>Pedidos por dia · 30 dias</h3>
            <div className={styles.chartPanel}>
              <DailyChart series={dailySeries} />
            </div>
            <div className={styles.chartLegend}>
              <span>
                <i className={styles.legendOnline} /> Online
              </span>
              <span>
                <i className={styles.legendBalcao} /> Balcão
              </span>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function StatusPills({ store }) {
  return (
    <div className={styles.pills}>
      <span className={`admin-store-pill ${store.aberta ? 'open' : 'closed'}`}>
        {store.aberta ? 'Aberta' : 'Fechada'}
      </span>
      {store.suspensa ? <span className="admin-sistema-suspended-pill">Suspensa</span> : null}
      {store.isModel ? (
        <span className="admin-sistema-model-pill">Loja modelo</span>
      ) : (
        <span className={`admin-sistema-activity-pill is-${store.activityStatus}`}>
          {activityStatusLabel(store.activityStatus)}
        </span>
      )}
    </div>
  );
}

function IconPencil() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 6.5l3 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconWhatsApp() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2a10 10 0 0 0-8.7 15l-1.3 4.8 4.9-1.3A10 10 0 1 0 12 2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 9.2c.2-.5.5-.5.8-.5h.6c.2 0 .4 0 .5.3l.8 1.9c.1.2.1.4 0 .6l-.5.6c-.1.2-.1.3 0 .5.6 1.1 1.6 2 2.8 2.6.2.1.3.1.5 0l.7-.5c.2-.1.4-.1.6 0l1.8.9c.3.1.3.3.3.5v.6c0 .3-.1.6-.5.7-1 .4-2.1.2-3.5-.6-1.8-1-3.2-2.5-4.1-4.3-.5-1-.7-2-.4-2.9z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function StoreDetailDrawer({ slug, onClose, onSlugRenamed, initialTab, onTabChange }) {
  const toast = useAdminToast();
  const { overlayPointerDown, overlayClick } = useAdminOverlayClose({
    onClose,
    isDirty: false,
  });
  const [store, setStore] = useState(null);
  const [tab, setTab] = useState('visao');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [goLiveDate, setGoLiveDate] = useState('');
  const [responsavelNimbus, setResponsavelNimbus] = useState('');
  const [contratoInicio, setContratoInicio] = useState('');
  const [contratoFim, setContratoFim] = useState('');
  const [teamForm, setTeamForm] = useState({
    email: '',
    nome: '',
    papel: 'atendente',
    tempPassword: generateTempPassword(),
  });
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [memberEditForm, setMemberEditForm] = useState({
    email: '',
    nome: '',
    papel: 'atendente',
    password: '',
  });
  const [ownerContactEditing, setOwnerContactEditing] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [infoSegmento, setInfoSegmento] = useState('');
  const [infoSlug, setInfoSlug] = useState('');
  const [feedbackItems, setFeedbackItems] = useState([]);
  const [feedbackAbertos, setFeedbackAbertos] = useState(0);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackFilter, setFeedbackFilter] = useState('aberto');
  const [checkoutPlan, setCheckoutPlan] = useState('loja_nova');
  const [billingPlans, setBillingPlans] = useState([]);
  const [carenciaEnabled, setCarenciaEnabled] = useState(false);
  const [carenciaModo, setCarenciaModo] = useState('7dias');
  const [carenciaInicio, setCarenciaInicio] = useState('');
  const [carenciaFim, setCarenciaFim] = useState('');
  const [checkoutLink, setCheckoutLink] = useState('');
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');

  function syncOwnerContactDraft(nextStore) {
    setOwnerEmail(nextStore?.owner?.email || '');
    setOwnerPhone(nextStore?.owner?.phone || '');
  }

  function startOwnerContactEdit() {
    syncOwnerContactDraft(store);
    setOwnerContactEditing(true);
  }

  function cancelOwnerContactEdit() {
    syncOwnerContactDraft(store);
    setOwnerContactEditing(false);
  }

  async function loadStore(targetSlug) {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/super-admin/stores/${encodeURIComponent(targetSlug)}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível carregar a loja.');
      }
      setStore(payload.store);
      setNotes(payload.store.notas_nimbus || '');
      setGoLiveDate(formatDateOnly(payload.store.data_go_live));
      setResponsavelNimbus(payload.store.responsavel_nimbus || '');
      setContratoInicio(formatDateOnly(payload.store.contrato_inicio));
      setContratoFim(formatDateOnly(payload.store.contrato_fim));
      setInfoSegmento(payload.store.segmento || '');
      setInfoSlug(payload.store.slug || '');
      syncOwnerContactDraft(payload.store);
      setOwnerContactEditing(false);
      cancelMemberEdit();
      if (payload.store.assinatura?.planoCodigo) {
        setCheckoutPlan(payload.store.assinatura.planoCodigo);
      }
      setCheckoutLink('');
      syncCarenciaDraftFromAssinatura(payload.store.assinatura, {
        setCarenciaEnabled,
        setCarenciaModo,
        setCarenciaInicio,
        setCarenciaFim,
      });
    } catch (loadError) {
      setStore(null);
      setError(loadError?.message || 'Erro ao carregar.');
    } finally {
      setLoading(false);
    }
  }

  async function loadFeedback(targetSlug, { silent = false } = {}) {
    if (!targetSlug) return;
    setFeedbackLoading(true);
    try {
      const response = await fetch(
        `/api/super-admin/stores/${encodeURIComponent(targetSlug)}/feedback`
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível carregar o feedback.');
      }
      setFeedbackItems(payload.items || []);
      setFeedbackAbertos(Number(payload.abertos || 0));
    } catch (loadError) {
      if (!silent) toast.error(loadError?.message || 'Erro ao carregar feedback.');
      if (!silent) {
        setFeedbackItems([]);
        setFeedbackAbertos(0);
      }
    } finally {
      setFeedbackLoading(false);
    }
  }

  async function updateFeedbackStatus(feedbackId, status) {
    if (!slug || !feedbackId) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/super-admin/stores/${encodeURIComponent(slug)}/feedback`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: feedbackId, status }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível atualizar.');
      }
      const next = payload.feedback;
      setFeedbackItems((prev) => {
        const nextItems = prev.map((item) => (item.id === next.id ? next : item));
        setFeedbackAbertos(nextItems.filter((item) => item.status === 'aberto').length);
        return nextItems;
      });
      toast.success(`Marcado como ${NIMBUS_FEEDBACK_STATUS_LABEL[status] || status}.`);
    } catch (updateError) {
      toast.error(updateError?.message || 'Erro ao atualizar feedback.');
    } finally {
      setSaving(false);
    }
  }

  const filteredFeedback = useMemo(() => {
    if (feedbackFilter === 'todos') return feedbackItems;
    return feedbackItems.filter((item) => item.status === feedbackFilter);
  }, [feedbackItems, feedbackFilter]);

  useEffect(() => {
    if (!slug) {
      queueMicrotask(() => {
        setStore(null);
        setError('');
        setTab('visao');
        setFeedbackItems([]);
        setFeedbackAbertos(0);
      });
      return undefined;
    }

    const nextTab = TABS.some((item) => item.id === initialTab) ? initialTab : 'visao';

    queueMicrotask(() => {
      setTab(nextTab);
      setOwnerContactEditing(false);
      cancelMemberEdit();
      setFeedbackFilter('aberto');
      loadStore(slug);
      loadFeedback(slug, { silent: true });
    });
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  function selectTab(id) {
    setTab(id);
    onTabChange?.(id);
    if (id === 'pessoas' && slug) {
      loadFeedback(slug);
    }
    if (id === 'comercial' && slug) {
      loadBillingPlans(slug);
    }
  }

  async function loadBillingPlans(targetSlug) {
    if (!targetSlug) return;
    try {
      const response = await fetch(
        `/api/super-admin/stores/${encodeURIComponent(targetSlug)}/billing`
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) return;
      if (Array.isArray(payload.plans) && payload.plans.length) {
        setBillingPlans(payload.plans);
      }
      if (payload.assinatura?.planoCodigo) {
        setCheckoutPlan(payload.assinatura.planoCodigo);
      }
      syncCarenciaDraftFromAssinatura(payload.assinatura, {
        setCarenciaEnabled,
        setCarenciaModo,
        setCarenciaInicio,
        setCarenciaFim,
      });
    } catch {
      // ignore
    }
  }

  function buildBillingCarenciaPayload() {
    return {
      enabled: carenciaEnabled,
      modo: carenciaModo,
      inicio: carenciaModo === 'personalizado' ? carenciaInicio || undefined : undefined,
      fim: carenciaModo === 'personalizado' ? carenciaFim || undefined : undefined,
    };
  }

  function validateBillingDraft() {
    if (!checkoutPlan) {
      toast.error('Selecione um plano.');
      return false;
    }
    if (carenciaEnabled && carenciaModo === 'personalizado') {
      if (!carenciaFim) {
        toast.error('Informe a data de término da carência.');
        return false;
      }
      const inicio = carenciaInicio || todaySaoPauloClient();
      if (carenciaFim < inicio) {
        toast.error('O término da carência deve ser após o início.');
        return false;
      }
    }
    return true;
  }

  async function saveNotesAndGoLive({ notesValue = notes, closeNotesModal = false } = {}) {
    if (!slug) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/super-admin/stores/${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notas_nimbus: notesValue,
          data_go_live: goLiveDate || null,
          responsavel_nimbus: responsavelNimbus,
          contrato_inicio: contratoInicio || null,
          contrato_fim: contratoFim || null,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível salvar.');
      }
      setNotes(notesValue);
      if (closeNotesModal) setNotesModalOpen(false);
      await loadStore(slug);
      toast.success(closeNotesModal ? 'Nota salva.' : 'CRM salvo.');
    } catch (saveError) {
      setError(saveError?.message || 'Erro ao salvar.');
      toast.error(saveError?.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  function openNotesModal() {
    setNotesDraft(notes || '');
    setNotesModalOpen(true);
  }

  async function saveStoreInfo() {
    if (!slug) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/super-admin/stores/${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segmento: infoSegmento,
          slug: infoSlug,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível salvar as informações da loja.');
      }

      const nextSlug = payload.store?.slug || slug;
      if (payload.store?.previousSlug && nextSlug !== slug) {
        onSlugRenamed?.(nextSlug);
      }

      await loadStore(nextSlug);
      toast.success('Informações da loja salvas.');
    } catch (saveError) {
      setError(saveError?.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function addTeamMember(event) {
    event.preventDefault();
    if (!slug) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/super-admin/stores/${encodeURIComponent(slug)}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamForm),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível adicionar membro.');
      }
      setStore((prev) => (prev ? { ...prev, team: payload.members } : prev));
      if (payload.tempPassword) {
        toast.success(`Conta criada. Senha temporária: ${payload.tempPassword}`, {
          duration: TOAST_DURATION_MS.long,
        });
      } else {
        toast.success('Membro vinculado à loja.');
      }
      setTeamForm({
        email: '',
        nome: '',
        papel: 'atendente',
        tempPassword: generateTempPassword(),
      });
    } catch (teamError) {
      toast.error(teamError?.message || 'Erro ao adicionar membro.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStoreOpen(isOpen) {
    if (!slug) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/super-admin/stores/${encodeURIComponent(slug)}/open-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fechadaManual: !isOpen }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível atualizar a loja.');
      }
      await loadStore(slug);
      toast.success(isOpen ? 'Loja reaberta manualmente.' : 'Loja fechada manualmente.');
    } catch (toggleError) {
      toast.error(toggleError?.message || 'Erro ao atualizar status.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleCardapioVersion(useV2) {
    if (!slug) return;
    const nextVersion = useV2 ? 'v2' : 'v1';
    if (useV2) {
      const confirmed = window.confirm(
        `Ativar cardápio v2 na URL pública de "${store?.nome || slug}"?\n\nTodos os visitantes verão o layout novo em ${store?.cardapioUrl || `/${slug}`}. Você pode voltar para v1 a qualquer momento.`
      );
      if (!confirmed) return;
    }

    setSaving(true);
    setError('');
    try {
      const response = await fetch(
        `/api/super-admin/stores/${encodeURIComponent(slug)}/cardapio-version`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ version: nextVersion }),
        }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível atualizar a versão do cardápio.');
      }
      await loadStore(slug);
      toast.success(useV2 ? 'Cardápio público v2 ativado.' : 'Cardápio público v1 restaurado.');
    } catch (versionError) {
      toast.error(versionError?.message || 'Erro ao atualizar versão do cardápio.');
    } finally {
      setSaving(false);
    }
  }

  async function togglePaymentIntegrations(enabled) {
    if (!slug || !store) return;
    const confirmed = window.confirm(
      enabled
        ? `Liberar integrações e pagamentos online para "${store.nome}"? O lojista passará a ver a seção Pagamentos em Integrações.`
        : `Bloquear pagamentos online para "${store.nome}"? Novos pagamentos e conexões serão impedidos, mas uma conta já conectada será preservada.`
    );
    if (!confirmed) return;

    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/super-admin/stores/${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pagamentos_online_habilitados: enabled }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível atualizar a liberação de pagamentos.');
      }
      await loadStore(slug);
      toast.success(enabled ? 'Pagamentos online liberados.' : 'Pagamentos online bloqueados.');
    } catch (paymentError) {
      toast.error(paymentError?.message || 'Erro ao atualizar pagamentos.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleAssinaturaNimbusHabilitada(enabled) {
    if (!slug || !store) return;
    const confirmed = window.confirm(
      enabled
        ? `Habilitar o bloco de assinatura Nimbus no admin de "${store.nome}"? Ele só aparece para o lojista quando a configuração do ambiente também permitir.`
        : `Desativar o bloco de assinatura Nimbus no admin de "${store.nome}"?`
    );
    if (!confirmed) return;

    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/super-admin/stores/${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assinatura_nimbus_habilitada: enabled }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível atualizar a assinatura Nimbus.');
      }
      await loadStore(slug);
      toast.success(
        enabled ? 'Assinatura Nimbus habilitada no admin da loja.' : 'Assinatura Nimbus desativada no admin da loja.'
      );
    } catch (assinaturaError) {
      toast.error(assinaturaError?.message || 'Erro ao atualizar assinatura Nimbus.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleSuspended() {
    if (!slug || !store) return;
    const nextSuspended = !store.suspensa;
    let motivo = '';
    if (nextSuspended) {
      const confirmed = window.confirm(
        `Suspender "${store.nome}"? O cardápio público e o login do lojista ficarão indisponíveis.`
      );
      if (!confirmed) return;
      motivo = window.prompt('Motivo da suspensão (opcional):', '') || '';
    } else {
      const confirmed = window.confirm(
        `Reativar "${store.nome}"? O cardápio e o admin voltam a funcionar normalmente.`
      );
      if (!confirmed) return;
    }

    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/super-admin/stores/${encodeURIComponent(slug)}/suspend`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspensa: nextSuspended, motivo }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível atualizar a suspensão.');
      }
      await loadStore(slug);
      toast.success(nextSuspended ? 'Loja suspensa.' : 'Loja reativada.');
    } catch (suspendError) {
      toast.error(suspendError?.message || 'Erro ao suspender loja.');
    } finally {
      setSaving(false);
    }
  }

  function downloadBackup() {
    if (!slug) return;
    window.location.href = `/api/super-admin/stores/${encodeURIComponent(slug)}/backup`;
  }

  async function saveOwnerContact() {
    if (!slug || !store?.owner?.userId) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(
        `/api/super-admin/stores/${encodeURIComponent(slug)}/owner-contact`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: ownerEmail,
            telefone: ownerPhone,
          }),
        }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível atualizar o contato.');
      }
      await loadStore(slug);
      setOwnerContactEditing(false);
      toast.success('Contato do proprietário atualizado.');
    } catch (contactError) {
      toast.error(contactError?.message || 'Erro ao atualizar contato.');
    } finally {
      setSaving(false);
    }
  }

  async function resetOwnerPassword() {
    if (!slug || !store?.owner?.email) return;
    const confirmed = window.confirm(
      `Gerar nova senha temporária para ${store.owner.email}? O dono poderá trocar em Esqueceu a senha no login.`
    );
    if (!confirmed) return;

    setSaving(true);
    setError('');
    try {
      const response = await fetch(
        `/api/super-admin/stores/${encodeURIComponent(slug)}/reset-password`,
        { method: 'POST' }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível resetar a senha.');
      }
      toast.success(`Nova senha temporária: ${payload.tempPassword}`, { duration: TOAST_DURATION_MS.long });
    } catch (resetError) {
      toast.error(resetError?.message || 'Erro ao resetar senha.');
    } finally {
      setSaving(false);
    }
  }

  function startMemberEdit(member) {
    setEditingMemberId(member.usuarioId);
    setMemberEditForm({
      email: member.email || '',
      nome: member.nome || '',
      papel: member.papel || 'atendente',
      password: '',
    });
  }

  function cancelMemberEdit() {
    setEditingMemberId(null);
    setMemberEditForm({
      email: '',
      nome: '',
      papel: 'atendente',
      password: '',
    });
  }

  async function patchMember(usuarioId, patch, { successMessage } = {}) {
    if (!slug) return null;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/super-admin/stores/${encodeURIComponent(slug)}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarioId, ...patch }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível atualizar membro.');
      }
      setStore((prev) => (prev ? { ...prev, team: payload.members } : prev));
      if (payload.tempPassword) {
        toast.success(`Nova senha temporária: ${payload.tempPassword}`, {
          duration: TOAST_DURATION_MS.long,
        });
      } else if (successMessage) {
        toast.success(successMessage);
      }
      return payload;
    } catch (patchError) {
      toast.error(patchError?.message || 'Erro ao atualizar membro.');
      setError(patchError?.message || 'Erro ao atualizar membro.');
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function saveMemberEdit(usuarioId) {
    const password = String(memberEditForm.password || '').trim();
    const payload = await patchMember(
      usuarioId,
      {
        email: memberEditForm.email,
        nome: memberEditForm.nome,
        papel: memberEditForm.papel,
        ...(password ? { password } : {}),
      },
      { successMessage: 'Membro atualizado.' }
    );
    if (payload) cancelMemberEdit();
  }

  async function resetMemberPassword(member) {
    if (!member?.usuarioId) return;
    const confirmed = window.confirm(
      `Gerar nova senha temporária para ${member.email || member.nome || 'este membro'}?`
    );
    if (!confirmed) return;
    const tempPassword = generateTempPassword();
    await patchMember(member.usuarioId, { password: tempPassword });
  }

  async function removeMember(member) {
    if (!slug || !member?.usuarioId) return;
    const teamSize = store?.team?.length || 0;
    if (teamSize <= 1) {
      toast.error('Não é possível remover o único membro da loja.');
      return;
    }
    const label = member.email || member.nome || 'este membro';
    const confirmed = window.confirm(
      `Remover ${label} desta loja? Se a pessoa não estiver em outra loja, a conta de login também será apagada.`
    );
    if (!confirmed) return;

    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/super-admin/stores/${encodeURIComponent(slug)}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarioId: member.usuarioId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível remover membro.');
      }
      setStore((prev) => (prev ? { ...prev, team: payload.members } : prev));
      if (editingMemberId === member.usuarioId) cancelMemberEdit();
      toast.success(
        payload.deletedAuthUser
          ? 'Membro removido e conta de login apagada.'
          : 'Membro removido desta loja.'
      );
    } catch (removeError) {
      toast.error(removeError?.message || 'Erro ao remover membro.');
      setError(removeError?.message || 'Erro ao remover membro.');
    } finally {
      setSaving(false);
    }
  }

  async function saveBillingActions() {
    if (!slug || !validateBillingDraft()) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/super-admin/stores/${encodeURIComponent(slug)}/billing`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'salvar_acoes',
          planoCodigo: checkoutPlan,
          carenciaEnabled,
          carenciaModo,
          carencia_inicio: carenciaModo === 'personalizado' ? carenciaInicio || undefined : undefined,
          carencia_fim: carenciaModo === 'personalizado' ? carenciaFim : undefined,
          carencia: buildBillingCarenciaPayload(),
        }),
      });
      if (response.status === 404) {
        toast.error('Billing ainda não disponível.');
        return;
      }
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível salvar as ações.');
      }
      await loadStore(slug);
      await loadBillingPlans(slug);
      if (payload.carencia?.enabled) {
        toast.success(
          payload.carencia.modo === '7dias'
            ? 'Plano e carência de 7 dias salvos.'
            : `Plano e carência salvos até ${formatDateOnly(payload.carencia.fim)}.`
        );
      } else if (payload.stripeMode === 'cleared') {
        toast.success('Ações salvas. Carência removida.');
      } else {
        toast.success('Ações salvas.');
      }
    } catch (saveError) {
      toast.error(saveError?.message || 'Erro ao salvar ações.');
    } finally {
      setSaving(false);
    }
  }

  async function copyBillingCheckoutLink() {
    if (!slug || !validateBillingDraft()) return;
    setSaving(true);
    try {
      const response = await fetch(
        `/api/super-admin/stores/${encodeURIComponent(slug)}/billing/checkout`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planoCodigo: checkoutPlan,
            carenciaEnabled,
            carenciaModo,
            carencia_inicio: carenciaModo === 'personalizado' ? carenciaInicio || undefined : undefined,
            carencia_fim: carenciaModo === 'personalizado' ? carenciaFim : undefined,
            carencia: buildBillingCarenciaPayload(),
          }),
        }
      );
      if (response.status === 404) {
        toast.error('Billing ainda não disponível.');
        return;
      }
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok || !payload.url) {
        throw new Error(payload.error || 'Não foi possível gerar o link de checkout.');
      }
      setCheckoutLink(payload.url);
      await navigator.clipboard.writeText(payload.url);
      await loadStore(slug);
      await loadBillingPlans(slug);
      toast.success(
        carenciaEnabled
          ? 'Link copiado — o Checkout mostra o período grátis para o cliente.'
          : 'Link de checkout copiado.'
      );
    } catch (checkoutError) {
      toast.error(checkoutError?.message || 'Erro ao gerar link de checkout.');
    } finally {
      setSaving(false);
    }
  }

  async function impersonateStore() {
    if (!slug) return;
    setSaving(true);
    try {
      const response = await fetch(
        `/api/super-admin/stores/${encodeURIComponent(slug)}/impersonate`,
        { method: 'POST' }
      );
      if (response.status === 404) {
        toast.error('Personificação ainda não disponível.');
        return;
      }
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível entrar como a loja.');
      }
      if (payload.slug) {
        writeActiveStoreSlug(payload.slug);
      }
      if (payload.redirect) {
        window.location.href = payload.redirect;
      }
    } catch (impersonateError) {
      toast.error(impersonateError?.message || 'Erro ao entrar como a loja.');
    } finally {
      setSaving(false);
    }
  }

  if (!slug) return null;

  const compare = store?.goLiveComparison;

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onPointerDown={overlayPointerDown}
      onClick={overlayClick}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Detalhe da loja"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.hero}>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar">
            ×
          </button>
          {store ? (
            <>
              <div className={styles.heroMain}>
                <StoreAvatar nome={store.nome} logoUrl={store.logoUrl} />
                <div className={styles.heroCopy}>
                  <p className={styles.eyebrow}>Detalhe da loja</p>
                  <h2 className={styles.title}>{store.nome}</h2>
                  <p className={styles.slug}>/{store.slug}</p>
                </div>
              </div>
              <div className={styles.heroStatusRow}>
                <StatusPills store={store} />
                <div className={styles.quickLinks}>
                  <a
                    className={styles.quickLink}
                    href={store.cardapioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Cardápio público ↗
                  </a>
                  <a className={styles.quickLink} href={store.adminUrl}>
                    Admin da loja →
                  </a>
                </div>
              </div>
            </>
          ) : (
            <SaStoreDrawerHeroSkeleton />
          )}
        </header>

        <div className={styles.tabs}>
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`${styles.tab}${tab === id ? ` ${styles.tabActive}` : ''}`}
              onClick={() => selectTab(id)}
            >
              {label}
              {id === 'pessoas' && feedbackAbertos > 0 ? (
                <span className={styles.feedbackTabBadge}>{feedbackAbertos}</span>
              ) : null}
            </button>
          ))}
        </div>

        <div className={styles.body}>
          {loading ? <SaStoreDrawerSkeleton /> : null}
          {error ? <p className={styles.alertError}>{error}</p> : null}

          {!loading && store && tab === 'visao' ? (
            <div className={styles.tabStack}>
              <div className={styles.grid2}>
                <section className={styles.panel}>
                  <div className={styles.ownerPanelHead}>
                    <h3 className={styles.panelTitle}>Proprietário</h3>
                    <div className={styles.ownerIconActions}>
                      {store.owner?.whatsappUrl ? (
                        <a
                          className={`${styles.ownerIconBtn} ${styles.ownerIconBtnWhatsapp}`}
                          href={store.owner.whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="WhatsApp do dono"
                          title="WhatsApp do dono"
                        >
                          <IconWhatsApp />
                        </a>
                      ) : null}
                      {store.owner?.userId && !ownerContactEditing ? (
                        <button
                          type="button"
                          className={styles.ownerIconBtn}
                          onClick={startOwnerContactEdit}
                          disabled={saving}
                          aria-label="Editar contato do proprietário"
                          title="Editar contato"
                        >
                          <IconPencil />
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <p className={styles.ownerName}>{store.owner?.name || '—'}</p>

                  {ownerContactEditing ? (
                    <>
                      <div className={styles.ownerEditForm}>
                        <label className={styles.formField}>
                          <span className={styles.formLabel}>E-mail de login</span>
                          <input
                            className={styles.formInput}
                            type="email"
                            value={ownerEmail}
                            onChange={(event) => setOwnerEmail(event.target.value)}
                            disabled={saving}
                          />
                        </label>
                        <label className={styles.formField}>
                          <span className={styles.formLabel}>Telefone</span>
                          <input
                            className={styles.formInput}
                            type="tel"
                            value={ownerPhone}
                            onChange={(event) => setOwnerPhone(event.target.value)}
                            disabled={saving}
                            placeholder="WhatsApp ou telefone da loja"
                          />
                        </label>
                      </div>
                      <div className={styles.ownerEditActions}>
                        <button
                          type="button"
                          className={styles.btnGhost}
                          disabled={saving}
                          onClick={cancelOwnerContactEdit}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className={styles.btnPrimary}
                          disabled={saving}
                          onClick={saveOwnerContact}
                        >
                          {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className={styles.metaList}>
                      <div className={styles.metaRow}>
                        <span className={styles.metaLabel}>E-mail</span>
                        <span className={styles.metaValue}>{store.owner?.email || '—'}</span>
                      </div>
                      <div className={styles.metaRow}>
                        <span className={styles.metaLabel}>Telefone</span>
                        <span className={styles.metaValue}>{store.owner?.phone || '—'}</span>
                      </div>
                    </div>
                  )}

                  {!store.owner?.userId ? (
                    <p className={styles.muted}>
                      Proprietário não vinculado — não é possível alterar o e-mail de login.
                    </p>
                  ) : null}
                </section>

                <section className={styles.panel}>
                  <h3 className={styles.panelTitle}>Sinais da loja</h3>
                  <div className={styles.statGrid}>
                    <div className={styles.statTile}>
                      <span>Cidade</span>
                      <strong>{store.endereco_cidade || '—'}</strong>
                    </div>
                    <div className={styles.statTile}>
                      <span>Membros</span>
                      <strong>{store.memberCount}</strong>
                    </div>
                    <div className={styles.statTile}>
                      <span>Go-live</span>
                      <strong>{formatDate(store.data_go_live)}</strong>
                    </div>
                    <div className={styles.statTile}>
                      <span>Último pedido</span>
                      <strong>{formatDate(store.lastPedidoAt)}</strong>
                    </div>
                  </div>
                </section>
              </div>

              <section className={styles.crmPanel}>
                <h3 className={styles.panelTitle}>Identidade da loja</h3>
                <div className={styles.crmGrid}>
                  <label className={styles.formField}>
                    <span className={styles.formLabel}>Segmento</span>
                    <SegmentCombobox
                      value={infoSegmento}
                      onChange={setInfoSegmento}
                      disabled={saving}
                    />
                  </label>
                  <label className={styles.formField}>
                    <span className={styles.formLabel}>Slug</span>
                    <input
                      className={styles.formInput}
                      value={infoSlug}
                      onChange={(event) =>
                        setInfoSlug(event.target.value.toLowerCase().replace(/\s+/g, '-'))
                      }
                      placeholder="minha-loja"
                      disabled={saving || store.isModel}
                    />
                  </label>
                </div>
                {infoSlug ? (
                  <p className={styles.muted}>
                    Cardápio público:{' '}
                    <a
                      href={getStorePublicUrl(infoSlug)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {getStorePublicHost(infoSlug)}
                    </a>
                  </p>
                ) : null}
                {store.isModel ? (
                  <p className={styles.muted}>A loja modelo não pode ter o slug alterado.</p>
                ) : null}
                <button
                  type="button"
                  className={styles.btnPrimary}
                  disabled={saving}
                  onClick={saveStoreInfo}
                >
                  {saving ? 'Salvando...' : 'Salvar identidade'}
                </button>
              </section>

              <section className={styles.panel}>
                <h3 className={styles.panelTitle}>Resumo comercial</h3>
                <div className={styles.billingSummary}>
                  <div className={styles.billingStat}>
                    <span>Assinatura</span>
                    <strong>{store.assinatura?.display?.label || 'Sem informações'}</strong>
                  </div>
                  {store.assinatura?.planoLabel && store.assinatura.planoLabel !== '—' ? (
                    <div className={styles.billingStat}>
                      <span>Plano</span>
                      <strong>{store.assinatura.planoLabel}</strong>
                    </div>
                  ) : null}
                  {typeof store.onboardingPct === 'number' ? (
                    <div className={styles.billingStat}>
                      <span>Onboarding</span>
                      <strong>{store.onboardingPct}%</strong>
                    </div>
                  ) : null}
                  {typeof store.healthScore === 'number' ? (
                    <div className={styles.billingStat}>
                      <span>Health score</span>
                      <strong>{store.healthScore}</strong>
                    </div>
                  ) : null}
                </div>
                <p className={styles.muted}>Detalhes e cobrança na aba Comercial.</p>
              </section>
            </div>
          ) : null}

          {!loading && store && tab === 'metricas' ? (
            <div className={styles.tabStack}>
              <section className={styles.panel}>
                <h3 className={styles.panelTitle}>Métricas</h3>
                <MetricsDashboard
                  metrics={store.metrics}
                  dailySeries={store.dailySeries}
                  compare={compare}
                />
              </section>
            </div>
          ) : null}

          {!loading && store && tab === 'operacao' ? (
            <div className={styles.tabStack}>
              <section className={styles.panel}>
                <h3 className={styles.panelTitle}>Controles da loja</h3>
                <div className={styles.controlGrid}>
                  <div className={styles.controlTile}>
                    <div className={styles.controlTileHead}>
                      <p className={styles.controlTileTitle}>Loja aberta</p>
                      <AdminAvailabilitySwitch
                        checked={!store.fechadaManual}
                        onChange={toggleStoreOpen}
                        label="Loja aberta manualmente"
                      />
                    </div>
                    <p className={styles.controlTileHint}>
                      {store.fechadaManual
                        ? 'Fechada manualmente — cardápio indisponível.'
                        : 'Aberta — respeita horários se não houver fechamento manual.'}
                    </p>
                  </div>

                  <div className={styles.controlTile}>
                    <div className={styles.controlTileHead}>
                      <p className={styles.controlTileTitle}>Cardápio v2</p>
                      <AdminAvailabilitySwitch
                        checked={isCardapioPublicV2(store.cardapio_publico_versao)}
                        onChange={toggleCardapioVersion}
                        label="Cardápio público v2"
                      />
                    </div>
                    <p className={styles.controlTileHint}>
                      {isCardapioPublicV2(store.cardapio_publico_versao) ? (
                        <>
                          Público em{' '}
                          <a href={store.cardapioUrl} target="_blank" rel="noopener noreferrer">
                            v2
                          </a>
                          .
                        </>
                      ) : (
                        <>
                          Público em v1. Preview:{' '}
                          <a
                            href={buildCardapioV2Path(store.slug)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            /v2
                          </a>
                        </>
                      )}
                    </p>
                  </div>

                  <div className={styles.controlTile}>
                    <div className={styles.controlTileHead}>
                      <p className={styles.controlTileTitle}>Pagamentos online</p>
                      <AdminAvailabilitySwitch
                        checked={Boolean(store.pagamentos_online_habilitados)}
                        onChange={togglePaymentIntegrations}
                        label="Integrações de pagamentos"
                      />
                    </div>
                    <p className={styles.controlTileHint}>
                      {store.pagamentos_online_habilitados
                        ? 'Liberado para conectar Pix/cartão.'
                        : 'Bloqueado no admin da loja.'}
                    </p>
                  </div>

                  <div className={styles.controlTile}>
                    <div className={styles.controlTileHead}>
                      <p className={styles.controlTileTitle}>Assinatura Nimbus</p>
                      <AdminAvailabilitySwitch
                        checked={Boolean(store.assinatura_nimbus_habilitada)}
                        onChange={toggleAssinaturaNimbusHabilitada}
                        label="Assinatura Nimbus no admin da loja"
                      />
                    </div>
                    <p className={styles.controlTileHint}>
                      {store.assinatura_nimbus_habilitada
                        ? 'Bloco de assinatura visível no admin da loja.'
                        : 'Oculto no admin da loja.'}
                    </p>
                  </div>
                </div>
              </section>

              <div className={styles.actionDock}>
                {!store.isModel ? (
                  <div className={styles.actionGroup}>
                    <p className={styles.actionGroupLabel}>Risco</p>
                    <button
                      type="button"
                      className={store.suspensa ? styles.btnSuccess : styles.btnDanger}
                      disabled={saving}
                      onClick={toggleSuspended}
                    >
                      {store.suspensa ? 'Reativar loja' : 'Suspender loja'}
                    </button>
                  </div>
                ) : null}

                <div className={styles.actionGroup}>
                  <p className={styles.actionGroupLabel}>Dados e acesso</p>
                  {store.owner?.email ? (
                    <button
                      type="button"
                      className={styles.btnGhost}
                      disabled={saving}
                      onClick={resetOwnerPassword}
                    >
                      Resetar senha do dono
                    </button>
                  ) : null}
                </div>
              </div>

              <section className={styles.panel}>
                <h3 className={styles.panelTitle}>Cardápio — backup, export e import</h3>
                <p className={styles.muted}>
                  <strong>Backup por data</strong> no primeiro bloco (cópias diárias). Export manual
                  e import ficam nos blocos seguintes.
                </p>
                <div className={styles.actionGroup}>
                  <p className={styles.actionGroupLabel}>Estado completo da loja</p>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    disabled={saving}
                    onClick={downloadBackup}
                  >
                    Baixar estado bruto (JSON técnico)
                  </button>
                </div>
                <StoreCatalogImportPanel
                  slug={slug}
                  onImported={() => {
                    loadStore(slug);
                    toast.success('Cardápio importado. Revise fotos e detalhes no admin da loja.');
                  }}
                />
              </section>
            </div>
          ) : null}

          {!loading && store && tab === 'comercial' ? (
            <div className={styles.tabStack}>
              <p className={`${styles.muted} ${styles.tabIntro}`}>
                Cobrança, carência e CRM interno. O lojista não vê este conteúdo.
              </p>

              <section className={styles.billingHero}>
                <h3 className={styles.billingHeroTitle}>Assinatura Stripe</h3>
                <p className={styles.muted}>
                  Escolha o plano e, se quiser, um período de carência. Salve e copie o link de
                  checkout para o cliente.
                </p>
                {store.assinatura ? (
                  <div className={styles.billingSummary}>
                    <div className={styles.billingStat}>
                      <span>Status</span>
                      <strong>{store.assinatura.display?.label || '—'}</strong>
                    </div>
                    <div className={styles.billingStat}>
                      <span>Plano</span>
                      <strong>{store.assinatura.planoLabel || '—'}</strong>
                    </div>
                    <div className={styles.billingStat}>
                      <span>Período atual até</span>
                      <strong>{formatDate(store.assinatura.currentPeriodEnd)}</strong>
                    </div>
                    <div className={styles.billingStat}>
                      <span>Valor</span>
                      <strong>{formatCurrencyCents(store.assinatura.valorCentavos)}</strong>
                    </div>
                  </div>
                ) : null}

                <div className={styles.planPicker} role="radiogroup" aria-label="Plano Nimbus">
                  {(billingPlans.length
                    ? billingPlans
                    : [
                        {
                          codigo: 'loja_nova',
                          label: 'Loja Nova',
                          valorCentavos: 19990,
                          intervalo: 'month',
                          descricao: 'Primeira loja',
                        },
                        {
                          codigo: 'loja_nova_149',
                          label: 'Loja Nova (R$ 149,90)',
                          valorCentavos: 14990,
                          intervalo: 'month',
                          descricao: 'Oferta já passada a clientes',
                        },
                        {
                          codigo: 'loja_nova_anual',
                          label: 'Loja Nova (Anual)',
                          valorCentavos: 179880,
                          valorMensalEquivCentavos: 14990,
                          intervalo: 'year',
                          descricao: 'Cobrança anual',
                        },
                        {
                          codigo: 'segunda_loja',
                          label: 'Segunda Loja',
                          valorCentavos: 11990,
                          intervalo: 'month',
                          descricao: 'Segunda unidade',
                        },
                        {
                          codigo: 'loja_complementar',
                          label: 'Loja Complementar',
                          valorCentavos: 9990,
                          intervalo: 'month',
                          descricao: 'Unidades adicionais',
                        },
                      ]
                  ).map((plan) => {
                    const active = checkoutPlan === plan.codigo;
                    const isAnnual = plan.intervalo === 'year';
                    const priceLabel = isAnnual
                      ? `${formatCurrencyCents(plan.valorCentavos)}/ano`
                      : `${formatCurrencyCents(plan.valorCentavos)}/mês`;
                    const equivLabel =
                      isAnnual && plan.valorMensalEquivCentavos
                        ? `equiv. ${formatCurrencyCents(plan.valorMensalEquivCentavos)}/mês`
                        : null;
                    return (
                      <button
                        key={plan.codigo}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        className={`${styles.planCard}${active ? ` ${styles.planCardActive}` : ''}`}
                        onClick={() => setCheckoutPlan(plan.codigo)}
                        disabled={saving}
                      >
                        <strong>{plan.label}</strong>
                        <span>{priceLabel}</span>
                        {equivLabel ? <em>{equivLabel}</em> : null}
                        {plan.descricao && !equivLabel ? <em>{plan.descricao}</em> : null}
                      </button>
                    );
                  })}
                </div>

                <div className={styles.carenciaBox}>
                  <label className={styles.carenciaToggle}>
                    <input
                      type="checkbox"
                      checked={carenciaEnabled}
                      disabled={saving}
                      onChange={(event) => {
                        const next = event.target.checked;
                        setCarenciaEnabled(next);
                        if (next && !carenciaModo) setCarenciaModo('7dias');
                      }}
                    />
                    <span>
                      <strong>Período de carência</strong>
                      <em>
                        Cliente não é cobrado até o fim do período; o Checkout mostra os dias
                        grátis.
                      </em>
                    </span>
                  </label>

                  {carenciaEnabled ? (
                    <>
                      <div
                        className={styles.carenciaModePicker}
                        role="radiogroup"
                        aria-label="Tipo de carência"
                      >
                        <button
                          type="button"
                          role="radio"
                          aria-checked={carenciaModo === '7dias'}
                          className={`${styles.carenciaModeCard}${
                            carenciaModo === '7dias' ? ` ${styles.carenciaModeCardActive}` : ''
                          }`}
                          disabled={saving}
                          onClick={() => setCarenciaModo('7dias')}
                        >
                          <strong>7 dias (padrão)</strong>
                          <span>A partir de agora — sem escolher datas</span>
                        </button>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={carenciaModo === 'personalizado'}
                          className={`${styles.carenciaModeCard}${
                            carenciaModo === 'personalizado'
                              ? ` ${styles.carenciaModeCardActive}`
                              : ''
                          }`}
                          disabled={saving}
                          onClick={() => {
                            setCarenciaModo('personalizado');
                            if (!carenciaInicio) setCarenciaInicio(todaySaoPauloClient());
                          }}
                        >
                          <strong>Personalizado</strong>
                          <span>Definir início e término</span>
                        </button>
                      </div>

                      {carenciaModo === 'personalizado' ? (
                        <div className={styles.carenciaDates}>
                          <label className={styles.formField}>
                            <span className={styles.formLabel}>Início</span>
                            <AdminDatePicker
                              compact
                              value={carenciaInicio}
                              onChange={setCarenciaInicio}
                            />
                          </label>
                          <label className={styles.formField}>
                            <span className={styles.formLabel}>Término</span>
                            <AdminDatePicker compact value={carenciaFim} onChange={setCarenciaFim} />
                          </label>
                        </div>
                      ) : (
                        <p className={styles.muted}>
                          Carência de 7 dias a partir de hoje ({todaySaoPauloClient()}).
                        </p>
                      )}
                    </>
                  ) : null}

                  {store.assinatura?.statusLocal === 'cortesia' && store.assinatura?.carenciaFim ? (
                    <p className={styles.muted}>
                      Carência ativa até {formatDate(store.assinatura.carenciaFim)}
                      {store.assinatura.planoLabel ? ` · plano ${store.assinatura.planoLabel}` : ''}.
                    </p>
                  ) : null}
                </div>

                <div className={styles.billingActions}>
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    disabled={saving}
                    onClick={saveBillingActions}
                  >
                    {saving ? 'Salvando...' : 'Salvar ações'}
                  </button>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    disabled={saving}
                    onClick={copyBillingCheckoutLink}
                  >
                    Copiar link do checkout
                  </button>
                </div>
                {checkoutLink ? (
                  <p className={styles.checkoutLinkHint} title={checkoutLink}>
                    Link gerado e copiado. Pode colar no WhatsApp ou e-mail do cliente.
                  </p>
                ) : null}
              </section>

              <section className={styles.crmPanel}>
                <h3 className={styles.panelTitle}>CRM interno</h3>
                <div className={styles.crmGrid}>
                  <label className={styles.formField}>
                    <span className={styles.formLabel}>Data go-live</span>
                    <AdminDatePicker compact value={goLiveDate} onChange={setGoLiveDate} />
                  </label>
                  <label className={styles.formField}>
                    <span className={styles.formLabel}>Contrato início</span>
                    <AdminDatePicker compact value={contratoInicio} onChange={setContratoInicio} />
                  </label>
                  <label className={styles.formField}>
                    <span className={styles.formLabel}>Contrato fim</span>
                    <AdminDatePicker compact value={contratoFim} onChange={setContratoFim} />
                  </label>
                </div>
                <label className={`${styles.formField} ${styles.formFieldSpan}`}>
                  <span className={styles.formLabel}>Responsável Nimbus</span>
                  <input
                    className={styles.formInput}
                    value={responsavelNimbus}
                    onChange={(event) => setResponsavelNimbus(event.target.value)}
                    placeholder="Nome do responsável interno"
                  />
                </label>
                <button
                  type="button"
                  className={styles.btnGhost}
                  disabled={saving}
                  onClick={() => saveNotesAndGoLive()}
                >
                  {saving ? 'Salvando...' : 'Salvar CRM'}
                </button>
              </section>

              <section className={styles.notesPanel}>
                <h3 className={styles.panelTitle}>Notas Nimbus</h3>
                <div className={styles.notesCollapsedRow}>
                  <div className={styles.notesCollapsedCopy}>
                    {String(notes || '').trim() ? (
                      <p className={styles.notesCollapsedPreview}>{notes}</p>
                    ) : (
                      <p className={styles.muted}>Nenhuma nota.</p>
                    )}
                  </div>
                  <button type="button" className={styles.notesLinkBtn} onClick={openNotesModal}>
                    {String(notes || '').trim() ? 'Editar' : 'Adicionar'}
                  </button>
                </div>
              </section>

              {store.onboarding ? (
                <section className={styles.crmPanel}>
                  <h3 className={styles.panelTitle}>
                    Onboarding
                    {typeof store.onboardingPct === 'number' ? ` · ${store.onboardingPct}%` : ''}
                  </h3>
                  <ul className={styles.onboardingList}>
                    {ONBOARDING_ITEMS.map((item) => {
                      const done = Boolean(store.onboarding[item.key]);
                      return (
                        <li
                          key={item.key}
                          className={`${styles.onboardingItem}${done ? ` ${styles.onboardingItemDone}` : ''}`}
                        >
                          <span className={styles.onboardingCheck}>{done ? '✓' : ''}</span>
                          {item.label}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}
            </div>
          ) : null}

          {!loading && store && tab === 'pessoas' ? (
            <div className={styles.tabStack}>
              <section className={styles.crmPanel}>
                <div className={styles.ownerPanelHead}>
                  <h3 className={styles.panelTitle}>Equipe</h3>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    disabled={saving}
                    onClick={impersonateStore}
                  >
                    Entrar como a loja
                  </button>
                </div>
                <p className={styles.muted}>
                  Membros com acesso ao admin desta loja. Dá para editar e-mail, senha e papel, ou
                  remover alguém — desde que não seja o único membro da loja.
                </p>

                <ul className={styles.teamList}>
                  {(store.team || []).map((member) => {
                    const displayName = member.nome || member.email || 'Sem nome';
                    const initial = displayName.trim().charAt(0).toUpperCase() || '?';
                    const isEditing = editingMemberId === member.usuarioId;
                    const canRemove = (store.team || []).length > 1;
                    return (
                      <li
                        key={member.usuarioId}
                        className={`${styles.teamCard}${member.ativo ? '' : ` ${styles.teamCardInactive}`}${isEditing ? ` ${styles.teamCardEditing}` : ''}`}
                      >
                        <div className={styles.teamCardMain}>
                          <div className={styles.teamIdentity}>
                            <span className={styles.teamInitial}>{initial}</span>
                            <div>
                              <p className={styles.teamName}>{displayName}</p>
                              <span className={styles.teamEmail}>{member.email || '—'}</span>
                              <span className={styles.rolePill}>{member.papelLabel}</span>
                              {!member.ativo ? (
                                <span className={styles.teamInactiveBadge}>Inativo</span>
                              ) : null}
                            </div>
                          </div>
                          {!isEditing ? (
                            <div className={styles.teamActions}>
                              <button
                                type="button"
                                className={styles.btnGhost}
                                disabled={saving}
                                onClick={() => startMemberEdit(member)}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className={styles.btnGhost}
                                disabled={saving}
                                onClick={() => resetMemberPassword(member)}
                              >
                                Nova senha
                              </button>
                              {member.papel !== 'proprietario' || canRemove ? (
                                <button
                                  type="button"
                                  className={styles.btnGhost}
                                  disabled={saving}
                                  onClick={() =>
                                    patchMember(member.usuarioId, { ativo: !member.ativo })
                                  }
                                >
                                  {member.ativo ? 'Desativar' : 'Reativar'}
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className={styles.btnDanger}
                                disabled={saving || !canRemove}
                                title={
                                  canRemove
                                    ? 'Remover da loja'
                                    : 'Não é possível remover o único membro'
                                }
                                onClick={() => removeMember(member)}
                              >
                                Excluir
                              </button>
                            </div>
                          ) : null}
                        </div>

                        {isEditing ? (
                          <div className={styles.teamEditPanel}>
                            <div className={styles.formGrid}>
                              <label className={styles.formField}>
                                <span className={styles.formLabel}>Nome</span>
                                <input
                                  className={styles.formInput}
                                  value={memberEditForm.nome}
                                  onChange={(event) =>
                                    setMemberEditForm((prev) => ({
                                      ...prev,
                                      nome: event.target.value,
                                    }))
                                  }
                                  disabled={saving}
                                />
                              </label>
                              <label className={styles.formField}>
                                <span className={styles.formLabel}>E-mail de login</span>
                                <input
                                  className={styles.formInput}
                                  type="email"
                                  value={memberEditForm.email}
                                  onChange={(event) =>
                                    setMemberEditForm((prev) => ({
                                      ...prev,
                                      email: event.target.value,
                                    }))
                                  }
                                  disabled={saving}
                                  required
                                />
                              </label>
                              <label className={styles.formField}>
                                <span className={styles.formLabel}>Papel</span>
                                <select
                                  className={styles.formInput}
                                  value={memberEditForm.papel}
                                  onChange={(event) =>
                                    setMemberEditForm((prev) => ({
                                      ...prev,
                                      papel: event.target.value,
                                    }))
                                  }
                                  disabled={saving}
                                >
                                  <option value="proprietario">Proprietário</option>
                                  <option value="gerente">Gerente</option>
                                  <option value="atendente">Atendente</option>
                                </select>
                              </label>
                              <label className={styles.formField}>
                                <span className={styles.formLabel}>Nova senha (opcional)</span>
                                <input
                                  className={styles.formInput}
                                  type="text"
                                  value={memberEditForm.password}
                                  onChange={(event) =>
                                    setMemberEditForm((prev) => ({
                                      ...prev,
                                      password: event.target.value,
                                    }))
                                  }
                                  disabled={saving}
                                  minLength={8}
                                  placeholder="Deixe em branco para manter"
                                />
                              </label>
                            </div>
                            <div className={styles.teamEditActions}>
                              <button
                                type="button"
                                className={styles.btnGhost}
                                disabled={saving}
                                onClick={cancelMemberEdit}
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                className={styles.btnPrimary}
                                disabled={saving}
                                onClick={() => saveMemberEdit(member.usuarioId)}
                              >
                                {saving ? 'Salvando...' : 'Salvar'}
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>

                <form className={styles.teamForm} onSubmit={addTeamMember}>
                  <h3 className={styles.teamFormTitle}>Adicionar operador</h3>
                  <div className={styles.formGrid}>
                    <label className={styles.formField}>
                      <span className={styles.formLabel}>E-mail</span>
                      <input
                        className={styles.formInput}
                        type="email"
                        value={teamForm.email}
                        onChange={(event) =>
                          setTeamForm((prev) => ({ ...prev, email: event.target.value }))
                        }
                        required
                      />
                    </label>
                    <label className={styles.formField}>
                      <span className={styles.formLabel}>Nome (opcional)</span>
                      <input
                        className={styles.formInput}
                        value={teamForm.nome}
                        onChange={(event) =>
                          setTeamForm((prev) => ({ ...prev, nome: event.target.value }))
                        }
                      />
                    </label>
                    <label className={styles.formField}>
                      <span className={styles.formLabel}>Papel</span>
                      <select
                        className={styles.formInput}
                        value={teamForm.papel}
                        onChange={(event) =>
                          setTeamForm((prev) => ({ ...prev, papel: event.target.value }))
                        }
                      >
                        <option value="gerente">Gerente</option>
                        <option value="atendente">Atendente</option>
                      </select>
                    </label>
                    <label className={styles.formField}>
                      <span className={styles.formLabel}>Senha temporária (e-mail novo)</span>
                      <input
                        className={styles.formInput}
                        value={teamForm.tempPassword}
                        onChange={(event) =>
                          setTeamForm((prev) => ({ ...prev, tempPassword: event.target.value }))
                        }
                        minLength={8}
                      />
                    </label>
                  </div>
                  <button
                    type="submit"
                    className={`${styles.btnPrimary} ${styles.teamFormSubmit}`}
                    disabled={saving}
                  >
                    {saving ? 'Salvando...' : 'Vincular membro'}
                  </button>
                </form>
              </section>

              <section className={styles.crmPanel}>
                <h3 className={styles.panelTitle}>Feedback</h3>
                <p className={`${styles.muted} ${styles.tabIntro}`}>
                  Mensagens enviadas pelo lojista em “Fale conosco”. Suporte via WhatsApp não entra
                  aqui — só o que foi registrado no inbox.
                </p>

                <div className={styles.feedbackToolbar}>
                  <div className={styles.feedbackFilters}>
                    {[
                      { id: 'aberto', label: 'Abertos' },
                      { id: 'lido', label: 'Lidos' },
                      { id: 'arquivado', label: 'Arquivados' },
                      { id: 'todos', label: 'Todos' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`${styles.feedbackFilterBtn}${feedbackFilter === item.id ? ` ${styles.feedbackFilterBtnActive}` : ''}`}
                        onClick={() => setFeedbackFilter(item.id)}
                      >
                        {item.label}
                        {item.id === 'aberto' && feedbackAbertos > 0 ? ` (${feedbackAbertos})` : ''}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    disabled={feedbackLoading}
                    onClick={() => loadFeedback(slug)}
                  >
                    {feedbackLoading ? 'Atualizando…' : 'Atualizar'}
                  </button>
                </div>

                {feedbackLoading && !filteredFeedback.length ? (
                  <SaFeedbackSkeleton />
                ) : null}

                {!feedbackLoading && !filteredFeedback.length ? (
                  <p className={styles.muted}>Nenhuma mensagem neste filtro.</p>
                ) : null}

                {!feedbackLoading || filteredFeedback.length ? (
                <div className={styles.feedbackList}>
                  {filteredFeedback.map((item) => (
                    <article key={item.id} className={styles.feedbackCard}>
                      <header className={styles.feedbackCardHead}>
                        <div>
                          <strong>{item.categoriaLabel}</strong>
                          <span className={styles.feedbackMeta}>
                            {item.autorNome || item.autorEmail || 'Lojista'}
                            {item.autorEmail ? ` · ${item.autorEmail}` : ''}
                            {' · '}
                            {formatDate(item.createdAt)}
                          </span>
                        </div>
                        <span
                          className={`${styles.feedbackStatus} ${styles[`feedbackStatus_${item.status}`] || ''}`}
                        >
                          {item.statusLabel}
                        </span>
                      </header>
                      <p className={styles.feedbackMessage}>{item.mensagem}</p>
                      <div className={styles.feedbackActions}>
                        {item.status !== 'lido' ? (
                          <button
                            type="button"
                            className={styles.btnGhost}
                            disabled={saving}
                            onClick={() => updateFeedbackStatus(item.id, 'lido')}
                          >
                            Marcar lido
                          </button>
                        ) : null}
                        {item.status !== 'arquivado' ? (
                          <button
                            type="button"
                            className={styles.btnGhost}
                            disabled={saving}
                            onClick={() => updateFeedbackStatus(item.id, 'arquivado')}
                          >
                            Arquivar
                          </button>
                        ) : null}
                        {item.status !== 'aberto' ? (
                          <button
                            type="button"
                            className={styles.btnGhost}
                            disabled={saving}
                            onClick={() => updateFeedbackStatus(item.id, 'aberto')}
                          >
                            Reabrir
                          </button>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
                ) : null}
              </section>

              {store.timeline?.length ? (
                <section className={styles.crmPanel}>
                  <h3 className={styles.panelTitle}>Linha do tempo</h3>
                  <ul className={styles.timelineList}>
                    {store.timeline.map((event) => (
                      <li key={event.id} className={styles.timelineItem}>
                        <strong>{event.titulo}</strong>
                        {event.detalhe ? <p>{event.detalhe}</p> : null}
                        <span className={styles.timelineDate}>{formatDate(event.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {store.suspensaoHistorico?.length ? (
                <section className={styles.crmPanel}>
                  <h3 className={styles.panelTitle}>Histórico de suspensão</h3>
                  <ul className={styles.timelineList}>
                    {store.suspensaoHistorico.map((event) => (
                      <li key={event.id} className={styles.timelineItem}>
                        <strong>{event.acao === 'suspender' ? 'Suspensa' : 'Reativada'}</strong>
                        {event.motivo ? <p>{event.motivo}</p> : null}
                        <span className={styles.timelineDate}>
                          {formatDate(event.created_at)}
                          {event.autor_email ? ` · ${event.autor_email}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {notesModalOpen && typeof document !== 'undefined'
        ? createPortal(
            <div
              className={styles.notesModalOverlay}
              onClick={() => setNotesModalOpen(false)}
              role="presentation"
            >
              <div
                className={styles.notesModal}
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="nimbus-notes-modal-title"
              >
                <div className={styles.notesModalHead}>
                  <h3 id="nimbus-notes-modal-title">Notas Nimbus</h3>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={() => setNotesModalOpen(false)}
                  >
                    Fechar
                  </button>
                </div>
                <div className={styles.notesModalBody}>
                  <textarea
                    className={styles.notesArea}
                    rows={6}
                    value={notesDraft}
                    onChange={(event) => setNotesDraft(event.target.value)}
                    placeholder="Ex.: piloto até agosto, domínio pendente, contato preferencial WhatsApp..."
                    autoFocus
                  />
                </div>
                <div className={styles.notesModalFooter}>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={() => setNotesModalOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    disabled={saving}
                    onClick={() =>
                      saveNotesAndGoLive({ notesValue: notesDraft, closeNotesModal: true })
                    }
                  >
                    {saving ? 'Salvando...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
