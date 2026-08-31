'use client';

import { useRef } from 'react';
import AdminIcon from '@/components/admin/AdminIcon';
import AdminTooltip from '@/components/admin/AdminTooltip';
import MoneyInput from './MoneyInput';
import {
  currency,
  formatDistanceKm,
  hasDeliveryAddress,
  PAYMENT_METHODS,
} from './orderDraftUtils';

export default function OrderPaymentTotalsBar({
  draft,
  setDraft,
  totals,
  deliveryFeeLoading = false,
}) {
  const trocoValueRef = useRef(null);
  const isDinheiro = draft.formaPagamento === 'dinheiro';
  const showTrocoValue = isDinheiro && draft.trocoAnswer === 'sim';
  const hasIdentifiableCustomer =
    Boolean(String(draft.clienteNome || '').trim()) &&
    Boolean(String(draft.telefone || '').replace(/\D/g, ''));

  function setPaymentMethod(formaPagamento) {
    if (formaPagamento === 'fiado' && !hasIdentifiableCustomer) return;
    setDraft((d) => ({
      ...d,
      formaPagamento,
      trocoAnswer: formaPagamento === 'dinheiro' ? d.trocoAnswer : '',
      trocoValue: formaPagamento === 'dinheiro' ? d.trocoValue : '',
    }));
  }

  function setTrocoAnswer(trocoAnswer) {
    setDraft((d) => ({
      ...d,
      trocoAnswer,
      trocoValue: trocoAnswer === 'sim' ? d.trocoValue : '',
    }));
    if (trocoAnswer === 'sim') {
      requestAnimationFrame(() => trocoValueRef.current?.querySelector('input')?.focus());
    }
  }

  return (
    <div className="admin-new-order-right-footer">
      <div className="admin-new-order-payment-pane">
        <h4 className="admin-order-section-title">Forma de pagamento</h4>
        <div className="admin-order-payment-flow">
          <div className="admin-order-payment-grid" role="group" aria-label="Formas de pagamento">
            {PAYMENT_METHODS.map((m) => {
              const active = draft.formaPagamento === m.value;
              const contaBlocked = m.value === 'fiado' && !hasIdentifiableCustomer;
              const button = (
                <button
                  type="button"
                  disabled={contaBlocked}
                  className={`admin-order-payment-btn${active ? ' active' : ''}${contaBlocked ? ' is-disabled' : ''}`}
                  style={
                    active
                      ? {
                          '--payment-accent': m.color,
                          borderColor: m.color,
                          background: `${m.color}14`,
                          color: m.color,
                        }
                      : undefined
                  }
                  onClick={() => setPaymentMethod(m.value)}
                >
                  <span className="admin-order-payment-btn-icon" aria-hidden="true">
                    {m.adminIcon ? (
                      <AdminIcon name={m.adminIcon} />
                    ) : (
                      <i className={`ph ph-${m.phIcon}`} aria-hidden="true" />
                    )}
                  </span>
                  <span>{m.label}</span>
                </button>
              );

              return (
                <AdminTooltip
                  key={m.value}
                  content={
                    contaBlocked
                      ? 'Informe nome e telefone do cliente para liberar Conta'
                      : ''
                  }
                  delayMs={40}
                  className="admin-order-payment-cell"
                >
                  <span className="admin-order-payment-cell-inner">{button}</span>
                </AdminTooltip>
              );
            })}
          </div>

          <div
            className={`admin-order-troco-side${isDinheiro ? ' is-visible' : ''}`}
            aria-hidden={!isDinheiro}
          >
            <div className="admin-order-troco-side-top">
              <span className="admin-order-troco-question">Precisa de troco?</span>
              <div className="admin-order-troco-choices">
                <button
                  type="button"
                  tabIndex={isDinheiro ? 0 : -1}
                  className={`admin-order-troco-choice${draft.trocoAnswer === 'sim' ? ' is-active' : ''}`}
                  onClick={() => setTrocoAnswer('sim')}
                >
                  Sim
                </button>
                <button
                  type="button"
                  tabIndex={isDinheiro ? 0 : -1}
                  className={`admin-order-troco-choice${draft.trocoAnswer === 'nao' ? ' is-active' : ''}`}
                  onClick={() => setTrocoAnswer('nao')}
                >
                  Não
                </button>
              </div>
            </div>
            <div
              className={`admin-order-troco-side-bottom${showTrocoValue ? ' is-visible' : ''}`}
              ref={trocoValueRef}
            >
              <MoneyInput
                value={draft.trocoValue}
                onChange={(trocoValue) => setDraft((d) => ({ ...d, trocoValue }))}
                placeholder="Troco para"
                className="admin-order-troco-value"
                disabled={!showTrocoValue}
                currencyMask
              />
            </div>
          </div>
        </div>
      </div>

      <div className="admin-new-order-totals-pane">
        <div className="admin-order-summary-row">
          <span>Subtotal</span>
          <span>{currency(totals.subtotal)}</span>
        </div>
        {draft.tipo === 'delivery' ? (
          <div className="admin-order-summary-row">
            <span>Entrega</span>
            <span>
              {deliveryFeeLoading
                ? 'Calculando…'
                : hasDeliveryAddress(draft)
                  ? `${currency(totals.entrega)}${formatDistanceKm(draft.distanciaKm) ? ` · ${formatDistanceKm(draft.distanciaKm)}` : ''}`
                  : '—'}
            </span>
          </div>
        ) : null}
        {totals.acrescimo > 0 ? (
          <div className="admin-order-summary-row">
            <span>Acréscimo</span>
            <span>+ {currency(totals.acrescimo)}</span>
          </div>
        ) : null}
        {totals.descontoManual > 0 ? (
          <div className="admin-order-summary-row">
            <span>Desconto</span>
            <span>− {currency(totals.descontoManual)}</span>
          </div>
        ) : null}
        {draft.cupomDesconto > 0 ? (
          <div className="admin-order-summary-row">
            <span>Cupom ({draft.cupomCodigo})</span>
            <span>− {currency(draft.cupomDesconto)}</span>
          </div>
        ) : null}
        <div className="admin-order-summary-row admin-order-summary-total admin-new-order-grand-total">
          <span>Total</span>
          <span>{currency(totals.total)}</span>
        </div>
      </div>
    </div>
  );
}
