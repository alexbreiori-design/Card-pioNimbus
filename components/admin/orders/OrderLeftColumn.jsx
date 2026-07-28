'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAdminData } from '@/hooks/useAdminData';
import { resolveEmpresaIdFromStore } from '@/lib/supabase/empresa';
import OrderTypeTabs from './OrderTypeTabs';
import OrderCartList from './OrderCartList';
import OrderAddressModal from './OrderAddressModal';
import OrderObservationModal from './OrderObservationModal';
import OrderAdjustmentsModal from './OrderAdjustmentsModal';
import CustomerNameAutocomplete from './CustomerNameAutocomplete';
import {
  clearOrderDraftNameAndAddress,
  formatAddressSummary,
  formatAdjustmentsSummary,
  fmtPhone,
  hasDeliveryAddress,
} from './orderDraftUtils';
import AdminIcon from '@/components/admin/AdminIcon';

export default function OrderLeftColumn({
  draft,
  setDraft,
  onSearchCustomer,
  onSelectCustomer,
  searchingCustomer,
  onEditCartItem,
}) {
  const { data } = useAdminData();
  const [addressOpen, setAddressOpen] = useState(false);
  const [obsOpen, setObsOpen] = useState(false);
  const [adjOpen, setAdjOpen] = useState(false);
  const [empresaId, setEmpresaId] = useState(null);
  const cupons = data.cupons || [];
  const addressFilled = hasDeliveryAddress(draft);
  const obsFilled = Boolean(String(draft.observacao || '').trim());
  const adjSummary = formatAdjustmentsSummary(draft);
  const addressSummary = formatAddressSummary(draft);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const id = await resolveEmpresaIdFromStore(data.loja?.slug);
        if (!cancelled) setEmpresaId(id || null);
      } catch {
        if (!cancelled) setEmpresaId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data.loja?.slug]);

  function confirmAddress(local) {
    setDraft((d) => ({
      ...d,
      ...local,
      distanciaKm: null,
      enderecoLatitude: null,
      enderecoLongitude: null,
    }));
    setAddressOpen(false);
  }

  const auxPortals =
    typeof document !== 'undefined'
      ? createPortal(
          <>
            {addressOpen ? (
              <OrderAddressModal
                draft={draft}
                slug={data.loja?.slug}
                onClose={() => setAddressOpen(false)}
                onConfirm={confirmAddress}
              />
            ) : null}
            {obsOpen ? (
              <OrderObservationModal
                value={draft.observacao}
                onClose={() => setObsOpen(false)}
                onConfirm={(observacao) => {
                  setDraft((d) => ({ ...d, observacao }));
                  setObsOpen(false);
                }}
              />
            ) : null}
            {adjOpen ? (
              <OrderAdjustmentsModal
                draft={draft}
                setDraft={setDraft}
                cupons={cupons}
                onClose={() => setAdjOpen(false)}
              />
            ) : null}
          </>,
          document.body
        )
      : null;

  return (
    <div className="admin-new-order-col admin-new-order-col-left">
      <div className="admin-new-order-left-scroll">
        <OrderTypeTabs
          value={draft.tipo}
          onChange={(tipo) =>
            setDraft((d) => ({
              ...d,
              tipo,
              taxaEntrega: tipo === 'delivery' ? d.taxaEntrega : '0',
              distanciaKm: tipo === 'delivery' ? d.distanciaKm : null,
              enderecoLatitude: tipo === 'delivery' ? d.enderecoLatitude : null,
              enderecoLongitude: tipo === 'delivery' ? d.enderecoLongitude : null,
            }))
          }
        />

        <section className="admin-order-section admin-order-section-first">
          <h4 className="admin-order-section-title">
            <AdminIcon name="customer" />
            Contato do cliente
          </h4>
          <div className="admin-order-contact-row">
            <CustomerNameAutocomplete
              value={draft.clienteNome}
              onChange={(clienteNome) => setDraft((d) => ({ ...d, clienteNome }))}
              onSelectCustomer={onSelectCustomer}
              empresaId={empresaId}
              showClear={
                Boolean(String(draft.clienteNome || '').trim()) ||
                Boolean(String(draft.telefone || '').replace(/\D/g, '')) ||
                addressFilled
              }
              onClear={() => setDraft((d) => clearOrderDraftNameAndAddress(d))}
            />
            <div className="admin-form-group admin-order-phone-field">
              <label className="admin-label">Telefone</label>
              <div className="admin-input-icon-wrap">
                <input
                  className="admin-input admin-input-with-icon"
                  value={draft.telefone}
                  onChange={(e) => setDraft((d) => ({ ...d, telefone: fmtPhone(e.target.value) }))}
                  placeholder="(11) 98765-4321"
                />
                <button
                  type="button"
                  className="admin-input-icon-btn admin-order-phone-search-btn"
                  onClick={onSearchCustomer}
                  disabled={searchingCustomer}
                  title="Buscar cliente"
                  aria-label="Buscar cliente"
                >
                  <AdminIcon name="search" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {draft.tipo === 'delivery' ? (
          <section className="admin-order-section">
            <div className="admin-order-collapsed-head">
              <h4 className="admin-order-section-title">
                <AdminIcon name="location" />
                Endereço
              </h4>
              <button
                type="button"
                className="admin-link-btn"
                onClick={() => setAddressOpen(true)}
              >
                {addressFilled ? 'Editar' : 'Adicionar'}
              </button>
            </div>
            {addressFilled ? (
              <p className="admin-order-collapsed-summary">{addressSummary}</p>
            ) : (
              <p className="admin-order-collapsed-empty">Nenhum endereço informado.</p>
            )}
          </section>
        ) : null}

        <section className="admin-order-section">
          <div className="admin-order-collapsed-head">
            <h4 className="admin-order-section-title">Observação</h4>
            <button type="button" className="admin-link-btn" onClick={() => setObsOpen(true)}>
              {obsFilled ? 'Editar' : 'Adicionar'}
            </button>
          </div>
          {obsFilled ? (
            <p className="admin-order-collapsed-summary">{draft.observacao}</p>
          ) : (
            <p className="admin-order-collapsed-empty">Nenhuma observação.</p>
          )}
        </section>

        <section className="admin-order-section">
          <div className="admin-order-collapsed-head">
            <h4 className="admin-order-section-title">Ajustes</h4>
            <button type="button" className="admin-link-btn" onClick={() => setAdjOpen(true)}>
              {adjSummary ? 'Editar ajustes' : 'Adicionar ajustes'}
            </button>
          </div>
          {adjSummary ? (
            <p className="admin-order-collapsed-summary">{adjSummary}</p>
          ) : (
            <p className="admin-order-collapsed-empty">Sem desconto, acréscimo ou cupom.</p>
          )}
        </section>

        {draft.cart.length > 0 ? (
          <section className="admin-order-section admin-order-cart-section">
            <h4 className="admin-order-section-title">
              <AdminIcon name="cart" />
              Itens adicionados
            </h4>
            <OrderCartList cart={draft.cart} setDraft={setDraft} onEditItem={onEditCartItem} />
          </section>
        ) : null}
      </div>

      {auxPortals}
    </div>
  );
}
