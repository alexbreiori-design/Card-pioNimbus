'use client';

import ImagePlaceholder from '@/components/admin/ImagePlaceholder';
import { currency } from './orderDraftUtils';

function PrinterIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9V2h12v7" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

export default function OrderRightColumn({
  draft,
  setDraft,
  products,
  productSearch,
  setProductSearch,
  onAddProduct,
  canSave,
  onRequestClose,
  onSave,
  onSavePrint,
}) {
  const q = productSearch.trim().toLowerCase();
  const filtered = products.filter((p) => {
    if (!q) return true;
    return (
      String(p.nome || '').toLowerCase().includes(q) ||
      String(p.descricao || '').toLowerCase().includes(q) ||
      String(p.medida || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="admin-new-order-col admin-new-order-col-right">
      <div className="admin-new-order-right-top">
        <button type="button" className="admin-text-btn" onClick={onRequestClose}>
          Cancelar
        </button>
        <div className="admin-new-order-right-actions">
          <button
            type="button"
            className={`admin-btn admin-btn-primary ${canSave ? '' : 'admin-btn-inactive'}`}
            disabled={!canSave}
            onClick={onSavePrint}
          >
            <PrinterIcon />
            Salvar e imprimir
          </button>
          <button
            type="button"
            className={`admin-btn admin-btn-primary ${canSave ? '' : 'admin-btn-inactive'}`}
            disabled={!canSave}
            onClick={onSave}
          >
            Salvar
          </button>
        </div>
      </div>

      <div className="admin-order-product-search">
        <label className="admin-label">Buscar produtos</label>
        <input
          className="admin-input"
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
          placeholder="Nome ou descrição..."
        />
      </div>

      <div className="admin-order-products-panel">
        <div className="admin-order-product-list">
          {filtered.length === 0 ? (
            <p className="admin-order-meta">Nenhum produto encontrado.</p>
          ) : (
            filtered.map((p) => (
              <div key={p.id} className="admin-order-product-row">
                <div className="admin-order-product-info">
                  <strong>{p.nome}</strong>
                  {p.medida ? <div className="admin-order-meta">{p.medida}</div> : null}
                  <div className="admin-order-product-price">{currency(p.preco)}</div>
                </div>
                <div className="admin-order-product-side">
                  {p.imagemUrl ? (
                    <img className="admin-order-product-thumb" src={p.imagemUrl} alt="" />
                  ) : (
                    <ImagePlaceholder size={52} />
                  )}
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary admin-icon-add-btn"
                    onClick={() => onAddProduct(p)}
                    aria-label={`Adicionar ${p.nome}`}
                  >
                    +
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {draft.cart.length > 0 ? (
          <div className="admin-order-cart">
            <h4 className="admin-order-section-title">Itens do pedido</h4>
            {draft.cart.map((item) => (
              <div key={item.id} className="admin-order-cart-item">
                <div className="admin-order-cart-item-head">
                  <strong>
                    {item.qtd}x {item.nome}
                  </strong>
                  <span>{currency(item.qtd * item.preco)}</span>
                </div>
                <div className="admin-order-cart-item-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn-ghost"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        cart: d.cart.map((x) =>
                          x.id === item.id ? { ...x, qtd: Math.max(1, x.qtd - 1) } : x
                        ),
                      }))
                    }
                  >
                    -
                  </button>
                  <span>{item.qtd}</span>
                  <button
                    type="button"
                    className="admin-btn admin-btn-ghost"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        cart: d.cart.map((x) => (x.id === item.id ? { ...x, qtd: x.qtd + 1 } : x)),
                      }))
                    }
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-danger"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        cart: d.cart.filter((x) => x.id !== item.id),
                      }))
                    }
                  >
                    Remover
                  </button>
                </div>
                <input
                  className="admin-input"
                  placeholder="Observação do item"
                  value={item.obs}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      cart: d.cart.map((x) => (x.id === item.id ? { ...x, obs: e.target.value } : x)),
                    }))
                  }
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
