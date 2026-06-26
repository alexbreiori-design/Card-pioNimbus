'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatCurrency } from '@/lib/admin/reports/reportFormatters';
import { useAdminOverlayClose } from '@/hooks/useAdminOverlayClose';
import { formatMoneyBrInput, parseMoneyBrInput } from '@/lib/moneyMask';
import { useCaixa } from '@/hooks/useCaixa';
import { useAdminOrders } from '@/hooks/useAdminOrders';

function formatTurnoTime(iso) {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function CaixaActionIcon({ name }) {
  const icons = {
    abrir: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
        <circle cx="12" cy="14" r="2" />
      </svg>
    ),
    reabrir: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <polyline points="3 4 3 10 9 10" />
      </svg>
    ),
    fechar: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
        <path d="M9 14h6" />
      </svg>
    ),
    sangria: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5v14" />
        <path d="M19 12H5" />
      </svg>
    ),
    suprimento: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 19V5" />
        <path d="M5 12h14" />
      </svg>
    ),
  };
  return <span className="admin-caixa-action-icon">{icons[name] || null}</span>;
}

export function CaixaSidebarStatus({ collapsed = false, compact = false, readOnly = false, onManageClick }) {
  const { loading, isOpen, turno, summary, pendingCount, error, refresh } = useCaixa();

  const statusLabel = loading
    ? 'Carregando…'
    : error
      ? 'Erro no caixa'
      : isOpen
        ? 'Caixa aberto'
        : 'Caixa fechado';

  const meta = loading
    ? 'Atualizando status…'
    : error
      ? error
      : isOpen
        ? `Desde ${formatTurnoTime(turno?.abertoEm)} · ${formatCurrency(summary?.totalVendas || 0)}`
        : pendingCount > 0
          ? `${pendingCount} pedido${pendingCount === 1 ? '' : 's'} aguardando`
          : 'Abra o caixa para operar pedidos';

  if (collapsed) {
    return (
      <button
        type="button"
        className="admin-caixa-sidebar-compact"
        title={`${statusLabel}. ${meta}`}
        onClick={readOnly ? undefined : onManageClick}
        disabled={readOnly}
      >
        <span className={`admin-caixa-dot ${loading ? 'loading' : isOpen ? 'open' : 'closed'}`} aria-hidden="true" />
      </button>
    );
  }

  if (compact) {
    return (
      <div className="admin-caixa-sidebar admin-caixa-sidebar--inline">
        <span className={`admin-caixa-dot ${loading ? 'loading' : isOpen ? 'open' : 'closed'}`} aria-hidden="true" />
        {!readOnly ? (
          <button type="button" className="admin-caixa-sidebar-btn admin-caixa-sidebar-btn--sm" onClick={onManageClick}>
            Gerenciar caixa
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="admin-caixa-sidebar">
      <div className="admin-caixa-sidebar-head">
        <span className={`admin-caixa-dot ${loading ? 'loading' : isOpen ? 'open' : 'closed'}`} aria-hidden="true" />
        <div>
          <p className="admin-caixa-sidebar-title">{statusLabel}</p>
          <p className={`admin-caixa-sidebar-meta${error ? ' is-error' : ''}`}>{meta}</p>
        </div>
      </div>
      {!readOnly ? (
        <div className="admin-caixa-sidebar-actions">
          {error ? (
            <button type="button" className="admin-btn admin-btn-ghost admin-caixa-sidebar-btn" onClick={() => refresh()}>
              Tentar novamente
            </button>
          ) : null}
          <button type="button" className="admin-btn admin-btn-ghost admin-caixa-sidebar-btn" onClick={onManageClick}>
            Gerenciar caixa
          </button>
        </div>
      ) : null}
    </div>
  );
}

function CaixaFormActions({ onBack, onCancel, backLabel = 'Voltar', cancelLabel = 'Cancelar', submitLabel, busy, showBack }) {
  return (
    <div className="admin-confirm-actions">
      {showBack ? (
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onBack} disabled={busy}>
          {backLabel}
        </button>
      ) : (
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </button>
      )}
      <button type="submit" className="admin-btn admin-btn-primary" disabled={busy}>
        {submitLabel}
      </button>
    </div>
  );
}

function CaixaManageAction({ icon, title, description, onClick, tone = 'default' }) {
  return (
    <button type="button" className={`admin-caixa-manage-action ${tone}`} onClick={onClick}>
      <CaixaActionIcon name={icon} />
      <span className="admin-caixa-manage-action-copy">
        <span>{title}</span>
        <small>{description}</small>
      </span>
      <svg className="admin-caixa-manage-action-chevron" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 7l6 5-6 5" />
      </svg>
    </button>
  );
}

export function CaixaManageModal({ open, onClose, onSuccess, initialView = 'menu' }) {
  const {
    loading,
    isOpen,
    canReopen,
    turno,
    summary,
    lastClosedTurno,
    openTurno,
    closeTurno,
    reopenTurno,
    addMovimento,
    busy,
    pendingCount,
    refresh,
    error,
  } = useCaixa();
  const { orders, refreshOrders } = useAdminOrders();

  const openKanbanOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          !order.arquivado &&
          order.status !== 'cancelado' &&
          ['novo', 'em_preparo', 'saiu_entrega'].includes(order.status)
      ),
    [orders]
  );

  const [view, setView] = useState('menu');
  const [closeStep, setCloseStep] = useState(1);
  const [openOrdersPrompt, setOpenOrdersPrompt] = useState(false);
  const [valorAbertura, setValorAbertura] = useState('');
  const [valorContado, setValorContado] = useState('');
  const [observacao, setObservacao] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [valorGaveta, setValorGaveta] = useState('');
  const [movValor, setMovValor] = useState('');
  const [movDescricao, setMovDescricao] = useState('');

  const { overlayPointerDown, overlayClick } = useAdminOverlayClose({ onClose, isDirty: false });

  useEffect(() => {
    if (!open) return;
    setView(initialView);
    setCloseStep(1);
    setValorAbertura('');
    setValorContado('');
    setObservacao('');
    setJustificativa('');
    setValorGaveta('');
    setMovValor('');
    setMovDescricao('');
    setOpenOrdersPrompt(false);
    void refresh({ silent: true });
  }, [open, initialView, refresh]);

  function handleSuccess(errorResult, successMessage) {
    if (errorResult instanceof Error) {
      onSuccess?.(errorResult);
      return;
    }
    onSuccess?.(null, successMessage);
    onClose?.();
  }

  async function handleAbrir(event) {
    event.preventDefault();
    try {
      await openTurno(parseMoneyBrInput(valorAbertura));
      handleSuccess(null, 'Caixa aberto.');
    } catch (err) {
      if (String(err?.message || '').includes('Já existe')) {
        setView('menu');
      }
      handleSuccess(err);
    }
  }

  async function finishCloseTurno(resolveOpenOrders) {
    try {
      await closeTurno({
        turnoId: turno?.id,
        valorContado: parseMoneyBrInput(valorContado),
        observacao,
        resolveOpenOrders,
      });
      await refreshOrders({ force: true, silent: true });
      setOpenOrdersPrompt(false);
      handleSuccess(null, 'Caixa fechado.');
    } catch (err) {
      handleSuccess(err);
    }
  }

  async function handleFechar(event) {
    event.preventDefault();
    if (closeStep === 1) {
      setCloseStep(2);
      return;
    }
    if (openKanbanOrders.length > 0) {
      setOpenOrdersPrompt(true);
      return;
    }
    await finishCloseTurno(null);
  }

  async function handleReabrir(event) {
    event.preventDefault();
    try {
      await reopenTurno({
        turnoId: lastClosedTurno?.id,
        justificativa,
        valorGaveta: parseMoneyBrInput(valorGaveta),
      });
      handleSuccess(null, 'Caixa reaberto.');
    } catch (err) {
      handleSuccess(err);
    }
  }

  async function handleMovimento(event, tipo) {
    event.preventDefault();
    try {
      await addMovimento({
        turnoId: turno?.id,
        tipo,
        valor: parseMoneyBrInput(movValor),
        descricao: movDescricao,
      });
      handleSuccess(null, tipo === 'sangria' ? 'Sangria registrada.' : 'Suprimento registrado.');
    } catch (err) {
      handleSuccess(err);
    }
  }

  if (!open) return null;

  const pagamentos = summary?.pagamentos || [];

  return (
    <>
      <div className="admin-confirm-overlay" role="presentation" onPointerDown={overlayPointerDown} onClick={overlayClick}>
        <div className="admin-caixa-modal admin-caixa-modal-wide" onClick={(e) => e.stopPropagation()}>
        {view === 'menu' ? (
          <>
            <div className="admin-caixa-modal-head">
              <h3>Gerenciar caixa</h3>
              <p>Operações de abertura, fechamento e movimentação do dinheiro.</p>
            </div>

            {loading ? (
              <div className="admin-caixa-manage-loading">Carregando status do caixa…</div>
            ) : error ? (
              <div className="admin-caixa-manage-error">
                <p>{error}</p>
                <button type="button" className="admin-btn admin-btn-ghost" onClick={() => refresh()}>
                  Tentar novamente
                </button>
              </div>
            ) : (
              <>
                <div className="admin-caixa-manage-status">
                  <span className={`admin-caixa-dot ${isOpen ? 'open' : 'closed'}`} aria-hidden="true" />
                  <div>
                    <strong>{isOpen ? 'Caixa aberto' : 'Caixa fechado'}</strong>
                    {isOpen ? (
                      <p>
                        {formatCurrency(summary?.totalVendas || 0)} em vendas
                        {summary?.totalPedidos ? ` · ${summary.totalPedidos} pedido(s)` : ''}
                        {pendingCount > 0 ? ` · ${pendingCount} aguardando` : ''}
                      </p>
                    ) : pendingCount > 0 ? (
                      <p>{pendingCount} pedido(s) aguardando abertura do caixa</p>
                    ) : (
                      <p>Escolha uma ação abaixo</p>
                    )}
                  </div>
                </div>

                {!isOpen ? (
                  <div className="admin-caixa-manage-group">
                    <p className="admin-caixa-manage-group-label">Operação</p>
                    {!canReopen ? (
                      <CaixaManageAction
                        icon="abrir"
                        title="Abrir caixa"
                        description="Iniciar operação com fundo de troco"
                        onClick={() => setView('abrir')}
                      />
                    ) : (
                      <CaixaManageAction
                        icon="reabrir"
                        title="Reabrir caixa"
                        description="Retomar o caixa fechado hoje com justificativa"
                        onClick={() => setView('reabrir')}
                      />
                    )}
                  </div>
                ) : (
                  <>
                    <div className="admin-caixa-manage-group">
                      <p className="admin-caixa-manage-group-label">Operação</p>
                      <CaixaManageAction
                        icon="fechar"
                        title="Fechar caixa"
                        description="Conferir vendas e encerrar o turno"
                        onClick={() => setView('fechar')}
                      />
                    </div>
                    <div className="admin-caixa-manage-group">
                      <p className="admin-caixa-manage-group-label">Movimentos</p>
                      <CaixaManageAction
                        icon="sangria"
                        title="Sangria"
                        description="Retirar dinheiro da gaveta"
                        tone="danger"
                        onClick={() => setView('sangria')}
                      />
                      <CaixaManageAction
                        icon="suprimento"
                        title="Suprimento"
                        description="Adicionar dinheiro à gaveta"
                        tone="success"
                        onClick={() => setView('suprimento')}
                      />
                    </div>
                  </>
                )}
              </>
            )}

            <div className="admin-confirm-actions">
              <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>
                Fechar
              </button>
            </div>
          </>
        ) : null}

        {view === 'abrir' ? (
          <form onSubmit={handleAbrir}>
            <div className="admin-caixa-modal-head">
              <h3>Abrir caixa</h3>
              <p>Informe o valor em dinheiro na gaveta para iniciar a operação.</p>
            </div>
            <label className="admin-field">
              <span>Fundo de troco</span>
              <input
                className="admin-input"
                inputMode="decimal"
                value={valorAbertura}
                onChange={(e) => setValorAbertura(formatMoneyBrInput(e.target.value))}
                autoFocus
              />
            </label>
            <CaixaFormActions
              showBack
              onBack={() => setView('menu')}
              busy={busy}
              submitLabel={busy ? 'Abrindo…' : 'Abrir caixa'}
            />
          </form>
        ) : null}

        {view === 'reabrir' ? (
          <form onSubmit={handleReabrir}>
            <div className="admin-caixa-modal-head">
              <h3>Reabrir caixa</h3>
              <p>Informe o motivo da reabertura e o valor atual na gaveta.</p>
            </div>
            <label className="admin-field">
              <span>Justificativa</span>
              <textarea
                className="admin-input"
                rows={3}
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                required
                autoFocus
              />
            </label>
            <label className="admin-field">
              <span>Valor na gaveta</span>
              <input
                className="admin-input"
                inputMode="decimal"
                value={valorGaveta}
                onChange={(e) => setValorGaveta(formatMoneyBrInput(e.target.value))}
              />
            </label>
            <CaixaFormActions
              showBack
              onBack={() => setView('menu')}
              busy={busy}
              submitLabel={busy ? 'Reabrindo…' : 'Reabrir caixa'}
            />
          </form>
        ) : null}

        {view === 'fechar' ? (
          <form onSubmit={handleFechar}>
            <div className="admin-caixa-modal-head">
              <h3>Fechar caixa</h3>
              <p>{closeStep === 1 ? 'Confira o resumo antes da contagem física.' : 'Conte o dinheiro na gaveta.'}</p>
            </div>
            {closeStep === 1 ? (
              <>
                <div className="admin-caixa-summary-grid">
                  <div>
                    <span>Pedidos</span>
                    <strong>{summary?.totalPedidos || 0}</strong>
                  </div>
                  <div>
                    <span>Vendas</span>
                    <strong>{formatCurrency(summary?.totalVendas || 0)}</strong>
                  </div>
                  <div>
                    <span>Dinheiro esperado</span>
                    <strong>{formatCurrency(summary?.esperadoDinheiro || 0)}</strong>
                  </div>
                </div>
                {pagamentos.length ? (
                  <ul className="admin-caixa-payment-list">
                    {pagamentos.map((row) => (
                      <li key={row.codigo}>
                        <span>{row.label}</span>
                        <strong>{formatCurrency(row.valor)}</strong>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : (
              <>
                <label className="admin-field">
                  <span>Valor contado</span>
                  <input
                    className="admin-input"
                    inputMode="decimal"
                    value={valorContado}
                    onChange={(e) => setValorContado(formatMoneyBrInput(e.target.value))}
                    autoFocus
                  />
                </label>
                <p className="admin-caixa-hint">Esperado: {formatCurrency(summary?.esperadoDinheiro || 0)}</p>
                <label className="admin-field">
                  <span>Observação (opcional)</span>
                  <textarea
                    className="admin-input"
                    rows={3}
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                  />
                </label>
              </>
            )}
            <CaixaFormActions
              showBack
              onBack={() => (closeStep === 2 ? setCloseStep(1) : setView('menu'))}
              busy={busy}
              submitLabel={busy ? 'Fechando…' : closeStep === 1 ? 'Continuar' : 'Fechar caixa'}
            />
          </form>
        ) : null}

        {view === 'sangria' || view === 'suprimento' ? (
          <form onSubmit={(e) => handleMovimento(e, view)}>
            <div className="admin-caixa-modal-head">
              <h3>{view === 'sangria' ? 'Sangria' : 'Suprimento'}</h3>
              <p>
                {view === 'sangria'
                  ? 'Registre a retirada de dinheiro da gaveta.'
                  : 'Registre a entrada de dinheiro na gaveta.'}
              </p>
            </div>
            <label className="admin-field">
              <span>Valor</span>
              <input
                className="admin-input"
                inputMode="decimal"
                value={movValor}
                onChange={(e) => setMovValor(formatMoneyBrInput(e.target.value))}
                autoFocus
              />
            </label>
            <label className="admin-field">
              <span>Descrição (opcional)</span>
              <input
                className="admin-input"
                value={movDescricao}
                onChange={(e) => setMovDescricao(e.target.value)}
              />
            </label>
            <CaixaFormActions
              showBack
              onBack={() => setView('menu')}
              busy={busy}
              submitLabel={busy ? 'Salvando…' : 'Confirmar'}
            />
          </form>
        ) : null}
        </div>
      </div>

      {openOrdersPrompt ? (
        <div className="admin-confirm-overlay admin-confirm-overlay-top" role="presentation">
          <div className="admin-caixa-open-orders-card" onClick={(e) => e.stopPropagation()}>
            <h4>Ainda existem pedidos em aberto</h4>
            <p>
              {openKanbanOrders.length} pedido{openKanbanOrders.length === 1 ? '' : 's'} ainda{' '}
              {openKanbanOrders.length === 1 ? 'está' : 'estão'} em andamento. O que deseja fazer antes de
              fechar o caixa?
            </p>
            <div className="admin-caixa-open-orders-actions">
              <button
                type="button"
                className="admin-btn admin-btn-outline"
                onClick={() => setOpenOrdersPrompt(false)}
                disabled={busy}
              >
                Voltar
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={() => void finishCloseTurno('concluir')}
                disabled={busy}
              >
                {busy ? 'Concluindo…' : 'Concluir todos'}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                onClick={() => void finishCloseTurno('cancelar')}
                disabled={busy}
              >
                {busy ? 'Cancelando…' : 'Cancelar todos'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function CaixaPedidosChip() {
  const { loading, isOpen, summary, error } = useCaixa();

  const label = useMemo(() => {
    if (loading) return 'Carregando caixa…';
    if (error) return 'Erro ao carregar caixa';
    if (isOpen) return `Caixa aberto · ${formatCurrency(summary?.totalVendas || 0)} em vendas`;
    return 'Caixa fechado';
  }, [loading, isOpen, summary, error]);

  return (
    <div className="admin-caixa-pedidos-chip-wrap">
      <span
        className={`admin-caixa-pedidos-chip ${
          loading ? 'is-loading' : error ? 'is-error' : isOpen ? 'is-open' : 'is-closed'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

export function CaixaStatusChip() {
  const { loading, isOpen, summary, error } = useCaixa();
  if (loading) return <span className="admin-caixa-outline-chip is-loading">Caixa…</span>;
  if (error) return <span className="admin-caixa-outline-chip is-error">Erro no caixa</span>;
  return (
    <span className={`admin-caixa-outline-chip ${isOpen ? 'is-open' : 'is-closed'}`}>
      {isOpen ? `Caixa aberto · ${formatCurrency(summary?.totalVendas || 0)} em vendas` : 'Caixa fechado'}
    </span>
  );
}
