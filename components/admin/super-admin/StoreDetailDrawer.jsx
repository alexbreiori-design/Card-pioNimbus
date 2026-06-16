'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminAvailabilitySwitch from '@/components/admin/AdminAvailabilitySwitch';
import { useAdminOverlayClose } from '@/hooks/useAdminOverlayClose';
import AdminDatePicker from '@/components/admin/AdminDatePicker';
import { activityStatusLabel } from '@/lib/superAdmin/storeActivity';
import { generateTempPassword } from '@/lib/superAdmin';
import StoreCatalogImportPanel from './StoreCatalogImportPanel';
import styles from './StoreDetailModal.module.css';

const TABS = [
  { id: 'resumo', label: 'Resumo' },
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
        return (
          <div
            key={row.date}
            className={styles.chartBarWrap}
            title={`${label}: ${row.pedidos} pedido(s)`}
          >
            <div className={styles.chartBar} style={{ height: `${Math.max(height, 6)}%` }} />
            <span className={styles.chartLabel}>{label}</span>
          </div>
        );
      })}
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

export default function StoreDetailDrawer({ slug, onClose }) {
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
  const [teamMessage, setTeamMessage] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');

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
      setOwnerEmail(payload.store.owner?.email || '');
      setOwnerPhone(payload.store.owner?.phone || '');
    } catch (loadError) {
      setStore(null);
      setError(loadError?.message || 'Erro ao carregar.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!slug) {
      setStore(null);
      setError('');
      setTab('resumo');
      return undefined;
    }

    setTab('resumo');
    loadStore(slug);
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

  async function addTeamMember(event) {
    event.preventDefault();
    if (!slug) return;
    setSaving(true);
    setTeamMessage('');
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
        setTeamMessage(`Conta criada. Senha temporária: ${payload.tempPassword}`);
      } else {
        setTeamMessage('Membro vinculado à loja.');
      }
      setTeamForm({
        email: '',
        nome: '',
        papel: 'atendente',
        tempPassword: generateTempPassword(),
      });
    } catch (teamError) {
      setError(teamError?.message || 'Erro ao adicionar membro.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStoreOpen(isOpen) {
    if (!slug) return;
    setSaving(true);
    setActionMessage('');
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
      setActionMessage(isOpen ? 'Loja reaberta manualmente.' : 'Loja fechada manualmente.');
    } catch (toggleError) {
      setError(toggleError?.message || 'Erro ao atualizar status.');
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
    setActionMessage('');
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
      setActionMessage(nextSuspended ? 'Loja suspensa.' : 'Loja reativada.');
    } catch (suspendError) {
      setError(suspendError?.message || 'Erro ao suspender loja.');
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
    setActionMessage('');
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
      setActionMessage('Contato do proprietário atualizado.');
    } catch (contactError) {
      setError(contactError?.message || 'Erro ao atualizar contato.');
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
    setActionMessage('');
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
      setActionMessage(`Nova senha temporária: ${payload.tempPassword}`);
    } catch (resetError) {
      setError(resetError?.message || 'Erro ao resetar senha.');
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
                  <h3 className={styles.panelTitle}>Proprietário</h3>
                  <p className={styles.ownerName}>{store.owner?.name || '—'}</p>
                  <div className={styles.formGrid} style={{ marginTop: 12 }}>
                    <label className={styles.formField}>
                      <span className={styles.formLabel}>E-mail de login</span>
                      <input
                        className={styles.formInput}
                        type="email"
                        value={ownerEmail}
                        onChange={(event) => setOwnerEmail(event.target.value)}
                        disabled={saving || !store.owner?.userId}
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
                  {store.owner?.userId ? (
                    <button
                      type="button"
                      className={styles.btnPrimary}
                      style={{ marginTop: 12 }}
                      disabled={saving}
                      onClick={saveOwnerContact}
                    >
                      {saving ? 'Salvando...' : 'Salvar contato'}
                    </button>
                  ) : (
                    <p className={styles.muted} style={{ marginTop: 12 }}>
                      Proprietário não vinculado — não é possível alterar o e-mail de login.
                    </p>
                  )}
                  {store.owner?.whatsappUrl ? (
                    <a
                      className={styles.btnPrimary}
                      href={store.owner.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      WhatsApp do dono
                    </a>
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

              {actionMessage ? <p className={styles.alertSuccess}>{actionMessage}</p> : null}
            </>
          ) : null}

          {store && tab === 'metricas' ? (
            <>
              <p className={`${styles.muted} ${styles.tabIntro}`}>
                Vendas pelo cardápio online (pedidos não cancelados). Uso interno Nimbus.
              </p>

              <div className={styles.metricsHero}>
                <article className={`${styles.metricCard} ${styles.metricCardFeatured}`}>
                  <span>Faturamento · 30 dias</span>
                  <strong>{formatCurrency(store.metrics?.faturamento30d)}</strong>
                </article>
                <article className={styles.metricCard}>
                  <span>Pedidos · 30 dias</span>
                  <strong>{store.metrics?.pedidos30d ?? 0}</strong>
                </article>
                <article className={styles.metricCard}>
                  <span>Pedidos · total</span>
                  <strong>{store.metrics?.pedidosTotal ?? 0}</strong>
                </article>
              </div>

              <div className={styles.sectionBlock}>
                <h3 className={styles.sectionHeading}>Totais acumulados</h3>
                <div className={styles.statGrid}>
                  <div className={styles.statTile}>
                    <span>Faturamento total</span>
                    <strong>{formatCurrency(store.metrics?.faturamentoTotal)}</strong>
                  </div>
                  <div className={styles.statTile}>
                    <span>Pedidos totais</span>
                    <strong>{store.metrics?.pedidosTotal ?? 0}</strong>
                  </div>
                </div>
              </div>

              <div className={styles.sectionBlock}>
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
                    Defina a data go-live na aba Notas para comparar vendas antes e depois do cardápio.
                  </p>
                )}
              </div>

              <div className={styles.sectionBlock}>
                <h3 className={styles.sectionHeading}>Pedidos por dia · 30 dias</h3>
                <div className={styles.chartPanel}>
                  <DailyChart series={store.dailySeries} />
                </div>
              </div>
            </>
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
              {teamMessage ? <p className={styles.alertSuccess}>{teamMessage}</p> : null}
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
                setActionMessage('Cardápio importado. Revise fotos e detalhes no admin da loja.');
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
