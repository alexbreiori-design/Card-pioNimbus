'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAdminData } from '@/hooks/useAdminData';
import { findCustomerByPhone, listClienteEnderecos } from '@/lib/supabase/customers';
import { resolveEmpresaIdFromStore } from '@/lib/supabase/empresa';
import OrderLeftColumn from './OrderLeftColumn';
import OrderRightColumn from './OrderRightColumn';
import OrderCartDock from './OrderCartDock';
import AdminDiscardDialog from '@/components/admin/AdminDiscardDialog';
import AdminIcon from '@/components/admin/AdminIcon';
import { useAdminOverlayClose } from '@/hooks/useAdminOverlayClose';
import { useOrderDeliveryFee } from '@/hooks/useOrderDeliveryFee';
import AdminOrderItemConfigurator from './AdminOrderItemConfigurator';
import { productNeedsConfiguration } from '@/lib/admin/orderProductUtils';
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
  categorias = [],
  initialDraft = null,
  editingOrderId = null,
}) {
  const { data } = useAdminData();
  const [draft, setDraft] = useState(EMPTY_ORDER_DRAFT);
  const [productSearch, setProductSearch] = useState('');
  const [discardOpen, setDiscardOpen] = useState(false);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [configProduct, setConfigProduct] = useState(null);

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

  const {
    overlayPointerDown,
    overlayClick,
    requestClose: requestOverlayClose,
  } = useAdminOverlayClose({
    onClose: requestClose,
    isDirty: false,
  });

  async function searchCustomer() {
    setSearchingCustomer(true);
    try {
      const empresaId = await resolveEmpresaIdFromStore(data.loja?.slug);
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

  function addCartLine(cartLine) {
    setDraft((d) => ({
      ...d,
      cart: [
        ...d.cart,
        {
          id: uid(),
          produtoId: cartLine.produtoId,
          nome: cartLine.nome,
          preco: cartLine.preco,
          medida: cartLine.medida || '',
          qtd: cartLine.qtd || 1,
          obs: cartLine.obs || '',
        },
      ],
    }));
  }

  function addProduct(product) {
    if (productNeedsConfiguration(product)) {
      setConfigProduct(product);
      return;
    }
    addCartLine({
      produtoId: product.id,
      nome: product.nome,
      preco: product.preco,
      medida: product.medida || '',
      qtd: 1,
      obs: '',
    });
  }

  if (!open) return null;

  return (
    <>
      <div className="admin-confirm-overlay" onClick={requestClose}>
        <div
          className={`admin-confirm-modal admin-new-order-modal${draft.cart.length ? ' has-cart' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="admin-new-order-title">
            <span className="admin-section-icon">
              <AdminIcon name="orders" />
            </span>
            {editingOrderId ? `Editar pedido #${editingOrderId}` : 'Novo pedido'}
          </h3>
          <div className="admin-new-order-body-wrap">
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
                products={products}
                categorias={categorias}
                productSearch={productSearch}
                setProductSearch={setProductSearch}
                onAddProduct={addProduct}
              />
            </div>
            <OrderCartDock cart={draft.cart} setDraft={setDraft} />
          </div>
          <div className="admin-new-order-footer">
            <button type="button" className="admin-text-btn" onClick={requestClose}>
              Cancelar
            </button>
            <div className="admin-new-order-footer-actions">
              <button
                type="button"
                className={`admin-btn admin-btn-primary ${canSave ? '' : 'admin-btn-inactive'}`}
                disabled={!canSave}
                onClick={() => canSave && onSave(draft, true)}
              >
                <AdminIcon name="printer" />
                Salvar e imprimir
              </button>
              <button
                type="button"
                className={`admin-btn admin-btn-primary ${canSave ? '' : 'admin-btn-inactive'}`}
                disabled={!canSave}
                onClick={() => canSave && onSave(draft, false)}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      </div>

      <AdminDiscardDialog
        open={discardOpen}
        title="Descartar pedido?"
        message="As informações preenchidas serão perdidas."
        confirmLabel="Descartar pedido"
        onCancel={() => setDiscardOpen(false)}
        onConfirm={() => {
          setDiscardOpen(false);
          onClose();
        }}
      />

      {typeof document !== 'undefined' && configProduct
        ? createPortal(
            <AdminOrderItemConfigurator
              open
              product={configProduct}
              catalogProducts={products.map((item) => item.catalogProduct).filter(Boolean)}
              onClose={() => setConfigProduct(null)}
              onConfirm={addCartLine}
            />,
            document.body
          )
        : null}
    </>
  );
}
