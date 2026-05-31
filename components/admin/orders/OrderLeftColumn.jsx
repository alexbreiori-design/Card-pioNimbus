'use client';

import { formatCep } from '@/lib/cep/viacep';
import { useCepLookup } from '@/hooks/useCepLookup';
import MoneyInput from './MoneyInput';
import OrderTypeTabs from './OrderTypeTabs';
import PhoneSearchInput from './PhoneSearchInput';
import { useAdminData } from '@/hooks/useAdminData';
import OrderCouponPicker from './OrderCouponPicker';
import { currency, PAYMENT_METHODS } from './orderDraftUtils';
import AdminIcon from '@/components/admin/AdminIcon';

export default function OrderLeftColumn({
  draft,
  setDraft,
  subtotal,
  entrega,
  total,
  onSearchCustomer,
  searchingCustomer,
  deliveryFeeLoading = false,
}) {
  const { data } = useAdminData();
  const cupons = data.cupons || [];
  const hasDeliveryAddress =
    Boolean(String(draft.logradouro || '').trim()) &&
    Boolean(String(draft.bairro || '').trim()) &&
    Boolean(String(draft.cidade || '').trim());
  const { lookup, loading: cepLoading } = useCepLookup();

  async function handleCepSearch() {
    const result = await lookup(draft.cep);
    if (!result) return;
    setDraft((d) => ({
      ...d,
      logradouro: result.logradouro || d.logradouro,
      bairro: result.bairro || d.bairro,
      cidade: result.cidade || d.cidade,
      estado: result.estado || d.estado,
    }));
  }

  return (
    <div className="admin-new-order-col admin-new-order-col-left">
      <OrderTypeTabs
        value={draft.tipo}
        onChange={(tipo) =>
          setDraft((d) => ({
            ...d,
            tipo,
            taxaEntrega: tipo === 'delivery' ? d.taxaEntrega : '0',
          }))
        }
      />

      <PhoneSearchInput
        value={draft.telefone}
        onChange={(telefone) => setDraft((d) => ({ ...d, telefone }))}
        onSearch={onSearchCustomer}
        searching={searchingCustomer}
      />

      <div className="admin-form-group">
        <label className="admin-label">Nome do cliente</label>
        <input
          className="admin-input"
          value={draft.clienteNome}
          onChange={(e) => setDraft((d) => ({ ...d, clienteNome: e.target.value }))}
          placeholder="Nome completo do cliente"
        />
      </div>

      {draft.tipo === 'delivery' ? (
        <section className="admin-order-section">
          <h4 className="admin-order-section-title">
            <AdminIcon name="location" />
            Endereço do cliente
          </h4>
          <div className="admin-form-group admin-order-cep-row">
            <label className="admin-label">CEP</label>
            <div className="admin-input-icon-wrap">
              <input
                className="admin-input admin-input-with-icon"
                value={draft.cep}
                onChange={(e) => setDraft((d) => ({ ...d, cep: formatCep(e.target.value) }))}
                placeholder="00000-000"
              />
              <button
                type="button"
                className="admin-input-icon-btn"
                onClick={handleCepSearch}
                disabled={cepLoading}
                title="Buscar CEP"
                aria-label="Buscar CEP"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
                  <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" />
                </svg>
              </button>
            </div>
          </div>
          <div className="admin-form-group">
            <label className="admin-label">Endereço</label>
            <input
              className="admin-input"
              value={draft.logradouro}
              onChange={(e) => setDraft((d) => ({ ...d, logradouro: e.target.value }))}
              placeholder="Rua, avenida, número..."
            />
          </div>
          <div className="admin-order-address-grid">
            <div className="admin-form-group admin-order-field-numero">
              <label className="admin-label">Número</label>
              <input
                className="admin-input"
                value={draft.numero}
                onChange={(e) => setDraft((d) => ({ ...d, numero: e.target.value }))}
                placeholder="124"
              />
            </div>
            <div className="admin-form-group admin-order-field-bairro">
              <label className="admin-label">Bairro</label>
              <input
                className="admin-input"
                value={draft.bairro}
                onChange={(e) => setDraft((d) => ({ ...d, bairro: e.target.value }))}
                placeholder="Centro"
              />
            </div>
            <div className="admin-form-group admin-order-field-cidade">
              <label className="admin-label">Cidade</label>
              <input
                className="admin-input"
                value={draft.cidade}
                onChange={(e) => setDraft((d) => ({ ...d, cidade: e.target.value }))}
                placeholder="São Paulo"
              />
            </div>
            <div className="admin-form-group admin-order-field-estado">
              <label className="admin-label">Estado</label>
              <input
                className="admin-input"
                value={draft.estado}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, estado: e.target.value.toUpperCase().slice(0, 2) }))
                }
                maxLength={2}
                placeholder="SP"
              />
            </div>
          </div>
          <div className="admin-form-group">
            <label className="admin-label">Complemento</label>
            <input
              className="admin-input"
              value={draft.complemento}
              onChange={(e) => setDraft((d) => ({ ...d, complemento: e.target.value }))}
              placeholder="Apto, bloco, referência..."
            />
          </div>
        </section>
      ) : null}

      <section className="admin-order-section">
        <h4 className="admin-order-section-title">Observação</h4>
        <textarea
          className="admin-input"
          rows={3}
          value={draft.observacao}
          onChange={(e) => setDraft((d) => ({ ...d, observacao: e.target.value }))}
          placeholder="Alguma observação sobre o pedido..."
        />
      </section>

      <section className="admin-order-section">
        <h4 className="admin-order-section-title">
          <AdminIcon name="cart" />
          Detalhes da compra
        </h4>
        <div className="admin-order-purchase-row">
          <MoneyInput
            label="Acréscimo"
            value={draft.acrescimo}
            onChange={(acrescimo) => setDraft((d) => ({ ...d, acrescimo }))}
            className="admin-order-field-money"
          />
          <MoneyInput
            label="Desconto"
            value={draft.desconto}
            onChange={(desconto) => setDraft((d) => ({ ...d, desconto }))}
            className="admin-order-field-money"
          />
        </div>
        <OrderCouponPicker draft={draft} setDraft={setDraft} cupons={cupons} />
      </section>

      <section className="admin-order-summary">
        <div className="admin-order-summary-row">
          <span>Subtotal</span>
          <span>{currency(subtotal)}</span>
        </div>
        {draft.tipo === 'delivery' ? (
          <div className="admin-order-summary-row">
            <span>Entrega</span>
            <span>
              {deliveryFeeLoading
                ? 'Calculando…'
                : hasDeliveryAddress
                  ? currency(entrega)
                  : '—'}
            </span>
          </div>
        ) : null}
        {draft.cupomDesconto > 0 ? (
          <div className="admin-order-summary-row">
            <span>Cupom ({draft.cupomCodigo})</span>
            <span>− {currency(draft.cupomDesconto)}</span>
          </div>
        ) : null}
        <div className="admin-order-summary-row admin-order-summary-total">
          <span>Total</span>
          <span>{currency(total)}</span>
        </div>
      </section>

      <section className="admin-order-section">
        <h4 className="admin-order-section-title">Forma de pagamento</h4>
        <div className="admin-order-payment-grid">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m.value}
              type="button"
              className={`admin-order-payment-btn ${draft.formaPagamento === m.value ? 'active' : ''}`}
              onClick={() => setDraft((d) => ({ ...d, formaPagamento: m.value }))}
            >
              {m.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
