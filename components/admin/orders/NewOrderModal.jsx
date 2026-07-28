'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAdminData } from '@/hooks/useAdminData';
import { findCustomerByPhone, listClienteEnderecos } from '@/lib/supabase/customers';
import { resolveEmpresaIdFromStore } from '@/lib/supabase/empresa';
import OrderLeftColumn from './OrderLeftColumn';
import OrderRightColumn from './OrderRightColumn';
import OrderPaymentTotalsBar from './OrderPaymentTotalsBar';
import AdminDiscardDialog from '@/components/admin/AdminDiscardDialog';
import AdminIcon from '@/components/admin/AdminIcon';
import { useAdminOverlayClose } from '@/hooks/useAdminOverlayClose';
import { useOrderDeliveryFee } from '@/hooks/useOrderDeliveryFee';
import AdminOrderItemConfigurator from './AdminOrderItemConfigurator';
import { productNeedsConfiguration } from '@/lib/admin/orderProductUtils';
import {
  computeOrderTotals,
  createOrderDraftLineId,
  EMPTY_ORDER_DRAFT,
  fmtPhone,
  hasDraftContent,
  isOrderDraftValid,
} from './orderDraftUtils';

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
  const [editingCartLineId, setEditingCartLineId] = useState(null);

  useEffect(() => {
    if (!open) return;
    setDraft(initialDraft ? { ...EMPTY_ORDER_DRAFT, ...initialDraft } : { ...EMPTY_ORDER_DRAFT });
    setProductSearch('');
    setDiscardOpen(false);
    setConfigProduct(null);
    setEditingCartLineId(null);
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

  const { overlayPointerDown, overlayClick } = useAdminOverlayClose({
    onClose: requestClose,
    isDirty: false,
  });

  async function applyCustomer(found) {
    if (!found) return;
    let principal = null;
    try {
      const empresaId = await resolveEmpresaIdFromStore(data.loja?.slug);
      if (empresaId) {
        const enderecos = await listClienteEnderecos(found.id, empresaId);
        principal = enderecos.find((a) => a.principal) || enderecos[0] || null;
      }
    } catch {
      /* keep name/phone even if address lookup fails */
    }
    setDraft((d) => ({
      ...d,
      clienteNome: found.name || d.clienteNome,
      telefone: found.phone ? fmtPhone(found.phone) : d.telefone,
      ...(d.tipo === 'delivery' && principal
        ? {
            cep: principal.cep || d.cep,
            logradouro: principal.street || d.logradouro,
            numero: principal.number || d.numero,
            bairro: principal.district || d.bairro,
            cidade: principal.city || d.cidade,
            estado: principal.state || d.estado,
            complemento: principal.complement || d.complemento,
            distanciaKm: null,
            enderecoLatitude: null,
            enderecoLongitude: null,
          }
        : {}),
    }));
  }

  async function searchCustomer() {
    setSearchingCustomer(true);
    try {
      const empresaId = await resolveEmpresaIdFromStore(data.loja?.slug);
      const found = await findCustomerByPhone(draft.telefone, empresaId);
      if (!found) return;
      await applyCustomer(found);
    } finally {
      setSearchingCustomer(false);
    }
  }

  function addCartLine(cartLine) {
    const qtdAdd = Number(cartLine.qtd || 1) || 1;
    setDraft((d) => {
      const matchIndex = d.cart.findIndex(
        (x) =>
          !x.config &&
          !cartLine.config &&
          x.produtoId === cartLine.produtoId &&
          String(x.medida || '') === String(cartLine.medida || '') &&
          Number(x.preco || 0) === Number(cartLine.preco || 0) &&
          String(x.obs || '') === String(cartLine.obs || '')
      );
      if (matchIndex >= 0) {
        return {
          ...d,
          cart: d.cart.map((x, i) =>
            i === matchIndex ? { ...x, qtd: Number(x.qtd || 1) + qtdAdd } : x
          ),
        };
      }
      return {
        ...d,
        cart: [
          ...d.cart,
          {
            id: createOrderDraftLineId(),
            produtoId: cartLine.produtoId,
            nome: cartLine.nome,
            preco: cartLine.preco,
            medida: cartLine.medida || '',
            qtd: qtdAdd,
            obs: cartLine.obs || '',
            ...(cartLine.config ? { config: cartLine.config } : {}),
          },
        ],
      };
    });
  }

  function updateCartLine(cartLine) {
    if (!editingCartLineId) {
      addCartLine(cartLine);
      return;
    }
    setDraft((d) => ({
      ...d,
      cart: d.cart.map((x) =>
        x.id === editingCartLineId
          ? {
              ...x,
              produtoId: cartLine.produtoId,
              nome: cartLine.nome,
              preco: cartLine.preco,
              medida: cartLine.medida || '',
              qtd: Number(cartLine.qtd || 1) || 1,
              obs: cartLine.obs || '',
              ...(cartLine.config ? { config: cartLine.config } : { config: undefined }),
            }
          : x
      ),
    }));
    setEditingCartLineId(null);
  }

  function addProduct(product) {
    if (productNeedsConfiguration(product)) {
      setEditingCartLineId(null);
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

  function editCartItem(item) {
    const product = products.find((entry) => entry.id === item.produtoId);
    if (!product || !productNeedsConfiguration(product)) return;
    setEditingCartLineId(item.id);
    setConfigProduct(product);
  }

  const editingCartLine = editingCartLineId
    ? draft.cart.find((item) => item.id === editingCartLineId)
    : null;

  if (!open) return null;

  return (
    <>
      <div
        className="admin-confirm-overlay"
        onPointerDown={overlayPointerDown}
        onClick={overlayClick}
      >
        <div
          className="admin-confirm-modal admin-new-order-modal"
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
                onSearchCustomer={searchCustomer}
                onSelectCustomer={applyCustomer}
                searchingCustomer={searchingCustomer}
                onEditCartItem={editCartItem}
              />
              <div className="admin-new-order-right-stack">
                <OrderRightColumn
                  products={products}
                  categorias={categorias}
                  productSearch={productSearch}
                  setProductSearch={setProductSearch}
                  onAddProduct={addProduct}
                />
                <OrderPaymentTotalsBar
                  draft={draft}
                  setDraft={setDraft}
                  totals={totals}
                  deliveryFeeLoading={deliveryFeeLoading}
                />
              </div>
            </div>
          </div>
          <div className="admin-new-order-footer">
            <div className="admin-new-order-footer-actions">
              <button
                type="button"
                className={`admin-btn admin-btn-primary admin-new-order-footer-btn ${canSave ? '' : 'admin-btn-inactive'}`}
                disabled={!canSave}
                onClick={() => canSave && onSave(draft, false)}
              >
                <AdminIcon name="check" />
                Salvar
              </button>
              <button
                type="button"
                className={`admin-btn admin-btn-primary admin-new-order-footer-btn ${canSave ? '' : 'admin-btn-inactive'}`}
                disabled={!canSave}
                onClick={() => canSave && onSave(draft, true)}
              >
                <AdminIcon name="printer" />
                Salvar e imprimir
              </button>
              <button
                type="button"
                className="admin-btn admin-new-order-footer-btn admin-new-order-cancel-btn"
                onClick={requestClose}
              >
                <AdminIcon name="close" />
                Cancelar
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
              key={editingCartLineId || `new-${configProduct.id}`}
              open
              product={configProduct}
              catalogProducts={products.map((item) => item.catalogProduct).filter(Boolean)}
              initialConfig={editingCartLine?.config || null}
              initialQty={editingCartLine?.qtd || 1}
              onClose={() => {
                setConfigProduct(null);
                setEditingCartLineId(null);
              }}
              onConfirm={updateCartLine}
            />,
            document.body
          )
        : null}
    </>
  );
}
