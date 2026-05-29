'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { findCustomerByPhone, listClienteEnderecos } from '@/lib/supabase/customers';
import { resolveEmpresaIdFromStore } from '@/lib/supabase/empresa';
import OrderLeftColumn from './OrderLeftColumn';
import OrderRightColumn from './OrderRightColumn';
import { useOrderDeliveryFee } from '@/hooks/useOrderDeliveryFee';
import {
  computeOrderTotals,
  EMPTY_ORDER_DRAFT,
  hasDraftContent,
  isOrderDraftValid,
} from './orderDraftUtils';

function uid() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

export default function NewOrderModal({
  open,
  onClose,
  onSave,
  products = [],
  initialDraft = null,
}) {
  const [draft, setDraft] = useState(EMPTY_ORDER_DRAFT);
  const [productSearch, setProductSearch] = useState('');
  const [discardOpen, setDiscardOpen] = useState(false);
  const [searchingCustomer, setSearchingCustomer] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(initialDraft ? { ...EMPTY_ORDER_DRAFT, ...initialDraft } : { ...EMPTY_ORDER_DRAFT });
    setProductSearch('');
    setDiscardOpen(false);
  }, [open, initialDraft]);

  const deliveryFeeLoading = useOrderDeliveryFee(draft, setDraft);

  const totals = useMemo(() => computeOrderTotals(draft), [draft]);
  const canSave = isOrderDraftValid(draft);

  const requestClose = useCallback(() => {
    if (hasDraftContent(draft)) {
      setDiscardOpen(true);
      return;
    }
    onClose();
  }, [draft, onClose]);

  async function searchCustomer() {
    setSearchingCustomer(true);
    try {
      const empresaId = await resolveEmpresaIdFromStore();
      const found = await findCustomerByPhone(draft.telefone, empresaId);
      if (!found) return;
      setDraft((d) => ({
        ...d,
        clienteNome: found.name || d.clienteNome,
      }));
      if (empresaId && draft.tipo === 'delivery') {
        const enderecos = await listClienteEnderecos(found.id, empresaId);
        const principal = enderecos.find((a) => a.principal) || enderecos[0];
        if (principal) {
          setDraft((d) => ({
            ...d,
            clienteNome: found.name || d.clienteNome,
            cep: principal.cep || d.cep,
            logradouro: principal.street || d.logradouro,
            numero: principal.number || d.numero,
            bairro: principal.district || d.bairro,
            cidade: principal.city || d.cidade,
            estado: principal.state || d.estado,
            complemento: principal.complement || d.complemento,
          }));
        }
      }
    } finally {
      setSearchingCustomer(false);
    }
  }

  function addProduct(product) {
    setDraft((d) => {
      const idx = d.cart.findIndex((x) => x.produtoId === product.id);
      if (idx > -1) {
        const next = [...d.cart];
        next[idx] = { ...next[idx], qtd: next[idx].qtd + 1 };
        return { ...d, cart: next };
      }
      return {
        ...d,
        cart: [
          ...d.cart,
          {
            id: uid(),
            produtoId: product.id,
            nome: product.nome,
            preco: product.preco,
            medida: product.medida || '',
            qtd: 1,
            obs: '',
          },
        ],
      };
    });
  }

  if (!open) return null;

  return (
    <>
      <div className="admin-confirm-overlay" onClick={requestClose}>
        <div
          className="admin-confirm-modal admin-new-order-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="admin-new-order-title">Novo pedido</h3>
          <div className="admin-new-order-layout">
            <OrderLeftColumn
              draft={draft}
              setDraft={setDraft}
              subtotal={totals.subtotal}
              entrega={totals.entrega}
              total={totals.total}
              onSearchCustomer={searchCustomer}
              searchingCustomer={searchingCustomer}
              deliveryFeeLoading={deliveryFeeLoading}
            />
            <OrderRightColumn
              draft={draft}
              setDraft={setDraft}
              products={products}
              productSearch={productSearch}
              setProductSearch={setProductSearch}
              onAddProduct={addProduct}
              canSave={canSave}
              onRequestClose={requestClose}
              onSave={() => canSave && onSave(draft, false)}
              onSavePrint={() => canSave && onSave(draft, true)}
            />
          </div>
        </div>
      </div>

      {discardOpen ? (
        <div className="admin-confirm-overlay" style={{ zIndex: 1200 }} onClick={() => setDiscardOpen(false)}>
          <div className="admin-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Descartar pedido?</h3>
            <p>As informações preenchidas serão perdidas.</p>
            <div className="admin-confirm-actions">
              <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setDiscardOpen(false)}>
                Continuar editando
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                onClick={() => {
                  setDiscardOpen(false);
                  onClose();
                }}
              >
                Descartar pedido
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
