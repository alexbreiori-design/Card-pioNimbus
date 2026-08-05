'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { formatCurrency } from '@/lib/admin/reports/reportFormatters';
import { useAdminOverlayClose } from '@/hooks/useAdminOverlayClose';
import { formatMoneyBrInput, parseMoneyBrInput } from '@/lib/moneyMask';
import { useCaixa } from '@/hooks/useCaixa';
import { useAdminOrders } from '@/hooks/useAdminOrders';
import { useAdminData } from '@/hooks/useAdminData';
import { useOrderPrint } from '@/context/OrderPrintContext';
import { roundMoney } from '@/lib/caixa/caixaUtils';
import CaixaCloseSummary from '@/components/admin/caixa/CaixaCloseSummary';
import CaixaBillingDialog from '@/components/admin/caixa/CaixaBillingDialog';
import {
  fetchCaixaBillingGate,
  hasShownCarenciaWarning,
  markCarenciaWarningShown,
  resolveWarningMessage,
} from '@/hooks/useCaixaBillingGate';
import { CAIXA_BILLING_BLOCK_CODE } from '@/lib/stripe/billingGates';

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
  const { loading, isOpen, turno, pendingCount, error, refresh } = useCaixa();

  const caption = loading
    ? 'Carregando…'
    : error
      ? error
      : isOpen
        ? `Caixa aberto · Desde ${formatTurnoTime(turno?.abertoEm)}`
        : pendingCount > 0
          ? `Caixa fechado · ${pendingCount} pedido${pendingCount === 1 ? '' : 's'} aguardando`
          : 'Caixa fechado';

  const manageBtn =
    !readOnly && !error ? (
      <button type="button" className="admin-caixa-sidebar-btn admin-caixa-sidebar-btn--outline" onClick={onManageClick}>
        Gerenciar caixa
      </button>
    ) : null;

  if (collapsed) {
    return (
      <button
        type="button"
        className="admin-caixa-sidebar-compact"
        title={caption}
        onClick={readOnly ? undefined : onManageClick}
        disabled={readOnly}
      >
        <span className={`admin-caixa-dot ${loading ? 'loading' : isOpen ? 'open' : 'closed'}`} aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className={`admin-caixa-sidebar-wrap${compact ? ' is-compact' : ''}`}>
      <div className="admin-caixa-sidebar-main">
        <span className={`admin-caixa-dot ${loading ? 'loading' : isOpen ? 'open' : 'closed'}`} aria-hidden="true" />
        {manageBtn}
      </div>
      <p className={`admin-caixa-sidebar-caption${error ? ' is-error' : ''}`}>{caption}</p>
      {error && !readOnly ? (
        <button type="button" className="admin-caixa-sidebar-retry" onClick={() => refresh()}>
          Tentar novamente
        </button>
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
  const { activeSlug } = useAdminData();
  const { printCaixaSummary } = useOrderPrint();

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
  const [billingDialog, setBillingDialog] = useState(null);
  const [gateChecking, setGateChecking] = useState(false);
  const openRequestIdRef = useRef(0);

  const { overlayPointerDown, overlayClick } = useAdminOverlayClose({ onClose, isDirty: false });

  const tryEnterOpenView = async (nextView) => {
    if (nextView !== 'abrir' && nextView !== 'reabrir') {
      setView(nextView);
      return true;
    }

    setGateChecking(true);
    try {
      const gate = await fetchCaixaBillingGate(activeSlug);
      if (gate.blocked) {
        setView('menu');
        setBillingDialog({
          mode: 'blocked',
          message: gate.message,
        });
        return false;
      }

      if (
        gate.warning &&
        gate.warning !== 'none' &&
        !hasShownCarenciaWarning(activeSlug, gate.warning)
      ) {
        setBillingDialog({
          mode: 'warning',
          warning: gate.warning,
          message: resolveWarningMessage(gate.warning, gate.message),
          pendingView: nextView,
        });
        return false;
      }

      setView(nextView);
      return true;
    } catch {
      setView(nextView);
      return true;
    } finally {
      setGateChecking(false);
    }
  };

  useEffect(() => {
    if (!open) return undefined;
    const requestId = ++openRequestIdRef.current;
    setCloseStep(1);
    setValorAbertura('');
    setValorContado('');
    setObservacao('');
    setJustificativa('');
    setValorGaveta('');
    setMovValor('');
    setMovDescricao('');
    setOpenOrdersPrompt(false);
    setBillingDialog(null);

    const boot = async () => {
      if (initialView === 'abrir' || initialView === 'reabrir') {
        setView('menu');
        const allowed = await tryEnterOpenView(initialView);
        if (openRequestIdRef.current !== requestId) return;
        if (!allowed) return;
      } else {
        setView(initialView || 'menu');
      }
      void refresh({ silent: true });
    };

    void boot();
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when modal opens / initialView changes
  }, [open, initialView, activeSlug]);

  function handleSuccess(errorResult, successMessage) {
    if (errorResult instanceof Error) {
      onSuccess?.(errorResult);
      return;
    }
    onSuccess?.(null, successMessage);
    onClose?.();
  }

  function handleBillingGateError(err) {
    if (err?.code === CAIXA_BILLING_BLOCK_CODE || /carência encerrou/i.test(String(err?.message || ''))) {
      setView('menu');
      setBillingDialog({
        mode: 'blocked',
        message: err.message,
      });
      return true;
    }
    return false;
  }

  async function handleAbrir(event) {
    event.preventDefault();
    try {
      await openTurno(parseMoneyBrInput(valorAbertura));
      handleSuccess(null, 'Caixa aberto.');
    } catch (err) {
      if (handleBillingGateError(err)) return;
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
      if (handleBillingGateError(err)) return;
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

  function handlePrintResumo() {
    if (!summary) return;
    const contado =
      closeStep === 2 && valorContado.trim()
        ? parseMoneyBrInput(valorContado)
        : null;
    const esperado = Number(summary.esperadoDinheiro || 0);
    const extras =
      contado != null
        ? {
            valorContado: contado,
            esperadoDinheiro: esperado,
            diferenca: roundMoney(contado - esperado),
            observacao: observacao.trim() || '',
          }
        : {
            esperadoDinheiro: esperado,
            observacao: observacao.trim() || '',
          };

    printCaixaSummary({ summary, turno, extras });
  }

  if (!open && !billingDialog) return null;

  return (
    <>
      {open ? (
      <div className="admin-confirm-overlay" role="presentation" onPointerDown={overlayPointerDown} onClick={overlayClick}>
        <div
          className={`admin-caixa-modal${
            view === 'fechar' ? ' admin-caixa-modal-close' : ' admin-caixa-modal-wide'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
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
                        onClick={() => {
                          if (!gateChecking) void tryEnterOpenView('abrir');
                        }}
                      />
                    ) : (
                      <CaixaManageAction
                        icon="reabrir"
                        title="Reabrir caixa"
                        description="Retomar o caixa fechado hoje com justificativa"
                        onClick={() => {
                          if (!gateChecking) void tryEnterOpenView('reabrir');
                        }}
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
          <form
            className={closeStep === 1 ? 'admin-caixa-close-form' : 'admin-caixa-close-form is-step2'}
            onSubmit={handleFechar}
          >
            {closeStep === 1 ? (
              <CaixaCloseSummary
                summary={summary}
                busy={busy}
                onBack={() => setView('menu')}
                onPrint={handlePrintResumo}
                onContinue={() => setCloseStep(2)}
              />
            ) : (
              <>
                <header className="admin-caixa-close-header">
                  <div className="admin-caixa-close-header-main">
                    <span className="admin-caixa-close-header-icon" aria-hidden="true">
                      <i className="ph ph-vault" />
                    </span>
                    <div>
                      <h3>Fechar caixa</h3>
                      <p>Conte o dinheiro na gaveta.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="admin-caixa-close-x"
                    onClick={() => setCloseStep(1)}
                    disabled={busy}
                    aria-label="Voltar"
                  >
                    ×
                  </button>
                </header>

                <div className="admin-caixa-close-step2">
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
                  <p className="admin-caixa-hint">
                    Esperado: {formatCurrency(summary?.esperadoDinheiro || 0)}
                  </p>
                  <label className="admin-field">
                    <span>Observação (opcional)</span>
                    <textarea
                      className="admin-input"
                      rows={3}
                      value={observacao}
                      onChange={(e) => setObservacao(e.target.value)}
                    />
                  </label>
                </div>

                <footer className="admin-caixa-close-footer">
                  <div className="admin-caixa-close-footer-card">
                    <div className="admin-caixa-close-footer-info">
                      <span className="admin-caixa-close-kpi-icon" aria-hidden="true">
                        <i className="ph ph-wallet" />
                      </span>
                      <div>
                        <strong>Dinheiro esperado em caixa</strong>
                        <span>Valor para conferência física</span>
                      </div>
                    </div>
                    <strong className="admin-caixa-close-footer-value">
                      {formatCurrency(summary?.esperadoDinheiro || 0)}
                    </strong>
                  </div>
                  <div className="admin-caixa-close-footer-actions">
                    <button
                      type="button"
                      className="admin-btn admin-caixa-close-print"
                      onClick={handlePrintResumo}
                      disabled={busy || !summary}
                    >
                      <i className="ph ph-printer" aria-hidden="true" />
                      Imprimir resumo
                    </button>
                    <button type="submit" className="admin-btn admin-btn-primary admin-caixa-close-continue" disabled={busy}>
                      {busy ? 'Fechando…' : 'Fechar caixa'}
                      <i className="ph ph-caret-right" aria-hidden="true" />
                    </button>
                  </div>
                </footer>
              </>
            )}
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
      ) : null}

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

      <CaixaBillingDialog
        open={Boolean(billingDialog)}
        mode={billingDialog?.mode || 'blocked'}
        message={billingDialog?.message}
        onClose={() => {
          const wasBlocked = billingDialog?.mode === 'blocked';
          setBillingDialog(null);
          if (wasBlocked) onClose?.();
        }}
        onContinue={() => {
          const pendingView = billingDialog?.pendingView || 'abrir';
          const warning = billingDialog?.warning;
          if (warning) markCarenciaWarningShown(activeSlug, warning);
          setBillingDialog(null);
          setView(pendingView);
        }}
      />
    </>
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
