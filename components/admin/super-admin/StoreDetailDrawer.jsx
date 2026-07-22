'use client';

import { useEffect, useMemo, useState } from 'react';
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
import StoreCatalogImportPanel from './StoreCatalogImportPanel';
import styles from './StoreDetailModal.module.css';

const TABS = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'informacoes', label: 'Informações' },
  { id: 'metricas', label: 'Métricas' },
  { id: 'equipe', label: 'Equipe' },
  { id: 'notas', label: 'Notas' },
  { id: 'cardapio', label: 'Cardápio' },
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
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
              Defina a data go-live na aba Notas para comparar vendas online antes e depois do
              cardápio.
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

export default function StoreDetailDrawer({ slug, onClose, onSlugRenamed }) {
  const toast = useAdminToast();
  const { overlayPointerDown, overlayClick } = useAdminOverlayClose({
    onClose,
    isDirty: false,
  });
  const [store, setStore] = useState(null);
  const [tab, setTab] = useState('resumo');
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
  const [ownerContactEditing, setOwnerContactEditing] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [infoSegmento, setInfoSegmento] = useState('');
  const [infoSlug, setInfoSlug] = useState('');

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
    } catch (loadError) {
      setStore(null);
      setError(loadError?.message || 'Erro ao carregar.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!slug) {
      queueMicrotask(() => {
        setStore(null);
        setError('');
        setTab('resumo');
      });
      return undefined;
    }

    queueMicrotask(() => {
      setTab('resumo');
      setOwnerContactEditing(false);
      loadStore(slug);
    });
    return undefined;
  }, [slug]);

  async function saveNotesAndGoLive() {
    if (!slug) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/super-admin/stores/${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notas_nimbus: notes,
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
      await loadStore(slug);
    } catch (saveError) {
      setError(saveError?.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
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

  async function toggleSuspended() {
    if (!slug || !store) return;
    const nextSuspended = !store.suspensa;
    const confirmed = window.confirm(
      nextSuspended
        ? `Suspender "${store.nome}"? O cardápio público e o login do lojista ficarão indisponíveis.`
        : `Reativar "${store.nome}"? O cardápio e o admin voltam a funcionar normalmente.`
    );
    if (!confirmed) return;

    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/super-admin/stores/${encodeURIComponent(slug)}/suspend`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspensa: nextSuspended }),
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

  async function patchMember(usuarioId, patch) {
    if (!slug) return;
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
    } catch (patchError) {
      setError(patchError?.message || 'Erro ao atualizar membro.');
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
            <h2 className={styles.title}>Carregando loja...</h2>
          )}
        </header>

        <div className={styles.tabs}>
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`${styles.tab}${tab === id ? ` ${styles.tabActive}` : ''}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className={styles.body}>
          {loading ? <p className={styles.loadingState}>Carregando detalhes...</p> : null}
          {error ? <p className={styles.alertError}>{error}</p> : null}

          {store && tab === 'resumo' ? (
            <>
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
                    <p className={styles.muted} style={{ marginTop: 12 }}>
                      Proprietário não vinculado — não é possível alterar o e-mail de login.
                    </p>
                  ) : null}
                </section>

                <section className={styles.panel}>
                  <h3 className={styles.panelTitle}>Operação</h3>
                  <div className={styles.statGrid}>
                    <div className={styles.statTile}>
                      <span>Cidade</span>
                      <strong>{store.endereco_cidade || '—'}</strong>
                    </div>
                    <div className={styles.statTile}>
                      <span>Segmento</span>
                      <strong>{store.segmento || '—'}</strong>
                    </div>
                    <div className={styles.statTile}>
                      <span>Membros</span>
                      <strong>{store.memberCount}</strong>
                    </div>
                    <div className={styles.statTile}>
                      <span>Criada em</span>
                      <strong>{formatDate(store.created_at)}</strong>
                    </div>
                    <div className={styles.statTile}>
                      <span>Go-live</span>
                      <strong>{formatDate(store.data_go_live)}</strong>
                    </div>
                    <div className={styles.statTile}>
                      <span>Último pedido</span>
                      <strong>{formatDate(store.lastPedidoAt)}</strong>
                    </div>
                    <div className={styles.statTile} style={{ gridColumn: '1 / -1' }}>
                      <span>Catálogo atualizado</span>
                      <strong>{formatDate(store.catalogUpdatedAt)}</strong>
                    </div>
                  </div>
                </section>
              </div>

              <section className={styles.panelAccent}>
                <div className={styles.remoteRow}>
                  <AdminAvailabilitySwitch
                    checked={!store.fechadaManual}
                    onChange={toggleStoreOpen}
                    label="Loja aberta manualmente"
                  />
                  <div className={styles.remoteCopy}>
                    <p className={styles.remoteTitle}>Controle remoto</p>
                    <p className={styles.remoteHint}>
                      {store.fechadaManual
                        ? 'Fechada manualmente — cardápio indisponível até reabrir.'
                        : 'Aberta — respeita horários se não houver fechamento manual.'}
                    </p>
                  </div>
                </div>
              </section>

              <section className={styles.panelAccent}>
                <div className={styles.remoteRow}>
                  <AdminAvailabilitySwitch
                    checked={isCardapioPublicV2(store.cardapio_publico_versao)}
                    onChange={toggleCardapioVersion}
                    label="Cardápio público v2"
                  />
                  <div className={styles.remoteCopy}>
                    <p className={styles.remoteTitle}>Layout do cardápio</p>
                    <p className={styles.remoteHint}>
                      {isCardapioPublicV2(store.cardapio_publico_versao) ? (
                        <>
                          Visitantes veem o <strong>v2</strong> em{' '}
                          <a href={store.cardapioUrl} target="_blank" rel="noopener noreferrer">
                            {store.cardapioUrl}
                          </a>
                          . Preview interno:{' '}
                          <a
                            href={buildCardapioV2Path(store.slug)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            /v2
                          </a>
                        </>
                      ) : (
                        <>
                          Visitantes veem o <strong>v1</strong> (padrão). Teste o v2 em{' '}
                          <a
                            href={buildCardapioV2Path(store.slug)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {buildCardapioV2Path(store.slug)}
                          </a>{' '}
                          antes de ativar aqui.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </section>

              <section className={styles.panelAccent}>
                <div className={styles.remoteRow}>
                  <AdminAvailabilitySwitch
                    checked={Boolean(store.pagamentos_online_habilitados)}
                    onChange={togglePaymentIntegrations}
                    label="Integrações de pagamentos"
                  />
                  <div className={styles.remoteCopy}>
                    <p className={styles.remoteTitle}>Pagamentos online</p>
                    <p className={styles.remoteHint}>
                      {store.pagamentos_online_habilitados
                        ? 'Liberado — a loja pode conectar um provedor e oferecer Pix ou cartão online.'
                        : 'Bloqueado — a seção Pagamentos fica oculta e as APIs recusam novas operações.'}
                    </p>
                  </div>
                </div>
              </section>

              <div className={styles.actionDock}>
                {!store.isModel ? (
                  <div className={styles.actionGroup}>
                    <p className={styles.actionGroupLabel}>Status da conta</p>
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
                  <button
                    type="button"
                    className={styles.btnGhost}
                    disabled={saving}
                    onClick={downloadBackup}
                  >
                    Exportar backup JSON
                  </button>
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

            </>
          ) : null}

          {store && tab === 'informacoes' ? (
            <div className={styles.notesLayout}>
              <p className={`${styles.muted} ${styles.tabIntro}`}>
                Segmento e slug definem módulos do admin e o endereço público do cardápio. Alterações
                aqui substituem o que o lojista vê em Minha loja.
              </p>

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
              </section>

              <button
                type="button"
                className={styles.btnPrimary}
                disabled={saving}
                onClick={saveStoreInfo}
              >
                {saving ? 'Salvando...' : 'Salvar informações'}
              </button>
            </div>
          ) : null}

          {store && tab === 'metricas' ? (
            <MetricsDashboard
              metrics={store.metrics}
              dailySeries={store.dailySeries}
              compare={compare}
            />
          ) : null}

          {store && tab === 'equipe' ? (
            <>
              <p className={styles.muted} style={{ marginBottom: 16 }}>
                Membros com acesso ao admin desta loja. Proprietário é definido na criação da loja.
              </p>

              <ul className={styles.teamList}>
                {(store.team || []).map((member) => {
                  const displayName = member.nome || member.email || 'Sem nome';
                  const initial = displayName.trim().charAt(0).toUpperCase() || '?';
                  return (
                    <li
                      key={member.usuarioId}
                      className={`${styles.teamCard}${member.ativo ? '' : ` ${styles.teamCardInactive}`}`}
                    >
                      <div className={styles.teamIdentity}>
                        <span className={styles.teamInitial}>{initial}</span>
                        <div>
                          <p className={styles.teamName}>{displayName}</p>
                          <span className={styles.teamEmail}>{member.email || '—'}</span>
                          <span className={styles.rolePill}>{member.papelLabel}</span>
                        </div>
                      </div>
                      <div className={styles.teamActions}>
                        {member.papel !== 'proprietario' ? (
                          <select
                            className={styles.teamSelect}
                            value={member.papel}
                            disabled={saving || !member.ativo}
                            onChange={(event) =>
                              patchMember(member.usuarioId, { papel: event.target.value })
                            }
                          >
                            <option value="gerente">Gerente</option>
                            <option value="atendente">Atendente</option>
                          </select>
                        ) : null}
                        {member.papel !== 'proprietario' ? (
                          <button
                            type="button"
                            className={styles.btnGhost}
                            disabled={saving}
                            onClick={() => patchMember(member.usuarioId, { ativo: !member.ativo })}
                          >
                            {member.ativo ? 'Desativar' : 'Reativar'}
                          </button>
                        ) : null}
                      </div>
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
                  className={styles.btnPrimary}
                  disabled={saving}
                  style={{ marginTop: 14 }}
                >
                  {saving ? 'Salvando...' : 'Vincular membro'}
                </button>
              </form>
            </>
          ) : null}

          {store && tab === 'notas' ? (
            <div className={styles.notesLayout}>
              <p className={`${styles.muted} ${styles.tabIntro}`}>
                Informações internas da Nimbus — contrato, piloto, observações de suporte. O lojista não
                vê este conteúdo.
              </p>

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
              </section>

              <section className={styles.notesPanel}>
                <h3 className={styles.panelTitle}>Notas Nimbus</h3>
                <textarea
                  className={styles.notesArea}
                  rows={8}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Ex.: piloto até agosto, domínio pendente, contato preferencial WhatsApp..."
                />
              </section>

              <button
                type="button"
                className={styles.btnPrimary}
                disabled={saving}
                onClick={saveNotesAndGoLive}
              >
                {saving ? 'Salvando...' : 'Salvar notas e CRM'}
              </button>
            </div>
          ) : null}

          {store && tab === 'cardapio' ? (
            <StoreCatalogImportPanel
              slug={slug}
              onImported={() => {
                loadStore(slug);
                toast.success('Cardápio importado. Revise fotos e detalhes no admin da loja.');
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
