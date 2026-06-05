'use client';

import { useMemo, useState } from 'react';
import AdminAvailabilitySwitch from '@/components/admin/AdminAvailabilitySwitch';
import ImagePlaceholder from '@/components/admin/ImagePlaceholder';
import { useAdminData } from '@/hooks/useAdminData';

function uid() {
  return `promo-${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function moneyToInput(value) {
  if (value === undefined || value === null || value === '') return '';
  return String(value).replace('.', ',');
}

function inputToMoney(value) {
  const parsed = Number(
    String(value || '')
      .replace(/[^\d,.-]/g, '')
      .replace(/\./g, '')
      .replace(',', '.')
  );
  return Number.isFinite(parsed) ? parsed : 0;
}

function emptyDraft() {
  return { produtoId: '', valorOriginal: '', valorPromocional: '' };
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function ProductThumb({ product, size = 52 }) {
  if (product?.imagemUrl) {
    return (
      <img
        className="admin-promo-product-thumb"
        src={product.imagemUrl}
        alt=""
        width={size}
        height={size}
      />
    );
  }
  return <ImagePlaceholder size={size} />;
}

export default function PromocoesCrud() {
  const { data, saveData } = useAdminData();
  const promocoes = data.promocoes || [];
  const produtos = (data.produtos || []).filter((p) => p.ativo !== false);
  const [msg, setMsg] = useState('');
  const [draft, setDraft] = useState(emptyDraft());
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const selectedProduct = useMemo(
    () => produtos.find((p) => p.id === draft.produtoId) || null,
    [produtos, draft.produtoId]
  );

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return produtos;
    return produtos.filter(
      (p) =>
        String(p.nome || '').toLowerCase().includes(q) ||
        String(p.descricao || '').toLowerCase().includes(q)
    );
  }, [produtos, productSearch]);

  function resetForm() {
    setDraft(emptyDraft());
    setEditingId(null);
    setFormOpen(false);
    setProductSearch('');
    setPickerOpen(false);
  }

  function openNewForm() {
    setDraft(emptyDraft());
    setEditingId(null);
    setFormOpen(true);
    setProductSearch('');
    setPickerOpen(false);
  }

  function onSelectProduct(produtoId) {
    const product = produtos.find((p) => p.id === produtoId);
    setDraft((d) => ({
      ...d,
      produtoId,
      valorOriginal: product ? moneyToInput(product.preco) : d.valorOriginal,
    }));
    setPickerOpen(false);
    setProductSearch('');
  }

  function handleSave(e) {
    e.preventDefault();
    setMsg('');
    const payload = {
      produtoId: draft.produtoId,
      valorOriginal: inputToMoney(draft.valorOriginal),
      valorPromocional: inputToMoney(draft.valorPromocional),
      ativo: true,
    };
    if (!payload.produtoId) {
      setMsg('Selecione um produto.');
      return;
    }
    if (payload.valorPromocional <= 0) {
      setMsg('Informe um valor promocional válido.');
      return;
    }
    if (payload.valorPromocional >= payload.valorOriginal) {
      setMsg('O valor promocional deve ser menor que o original.');
      return;
    }

    saveData((prev) => {
      if (editingId) {
        return {
          ...prev,
          promocoes: prev.promocoes.map((p) =>
            p.id === editingId
              ? {
                  ...p,
                  ...payload,
                  ativo: p.ativo !== false,
                }
              : p
          ),
        };
      }
      return {
        ...prev,
        promocoes: [
          ...prev.promocoes,
          {
            id: uid(),
            ...payload,
            ordem: prev.promocoes.length,
          },
        ],
      };
    });

    resetForm();
    setMsg(editingId ? 'Promoção atualizada.' : 'Promoção cadastrada.');
    setTimeout(() => setMsg(''), 2500);
  }

  function handleToggle(promo) {
    saveData((prev) => ({
      ...prev,
      promocoes: prev.promocoes.map((p) =>
        p.id === promo.id ? { ...p, ativo: !p.ativo } : p
      ),
    }));
  }

  function handleDelete(id) {
    if (!window.confirm('Remover esta promoção?')) return;
    saveData((prev) => ({
      ...prev,
      promocoes: prev.promocoes.filter((p) => p.id !== id),
    }));
    if (editingId === id) resetForm();
  }

  function startEdit(promo) {
    setEditingId(promo.id);
    setDraft({
      produtoId: promo.produtoId,
      valorOriginal: moneyToInput(promo.valorOriginal),
      valorPromocional: moneyToInput(promo.valorPromocional),
    });
    setFormOpen(true);
    setProductSearch('');
    setPickerOpen(false);
  }

  function productById(produtoId) {
    return produtos.find((p) => p.id === produtoId) || null;
  }

  function productName(produtoId) {
    return productById(produtoId)?.nome || 'Produto removido';
  }

  return (
    <div className="admin-crud-panel">
      <div className="admin-delivery-areas-toolbar">
        <p className="admin-help-text admin-delivery-areas-hint">
          Produtos em promoção aparecem na categoria Promoções no cardápio online, antes das demais.
        </p>
        <button type="button" className="admin-btn admin-btn-primary" onClick={openNewForm}>
          + Nova promoção
        </button>
      </div>

      {msg ? <p className="admin-store-message admin-delivery-areas-msg">{msg}</p> : null}

      {formOpen ? (
        <form className="admin-delivery-area-form admin-card" onSubmit={handleSave}>
          <h3 className="admin-delivery-area-form-title">
            {editingId ? 'Editar promoção' : 'Nova promoção'}
          </h3>
          <div className="admin-promo-form-grid admin-promo-form-grid-with-product">
            <div className="admin-form-group admin-promo-product-field">
              <label className="admin-label">Produto</label>
              {selectedProduct ? (
                <div className="admin-promo-selected-product">
                  <ProductThumb product={selectedProduct} size={56} />
                  <div className="admin-promo-selected-product-info">
                    <strong>{selectedProduct.nome}</strong>
                    <span>{formatCurrency(selectedProduct.preco)}</span>
                  </div>
                  <button
                    type="button"
                    className="admin-link-btn"
                    onClick={() => {
                      setPickerOpen(true);
                      setProductSearch('');
                    }}
                  >
                    Trocar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="admin-input admin-promo-product-trigger"
                  onClick={() => setPickerOpen(true)}
                >
                  Selecionar produto…
                </button>
              )}
              {pickerOpen ? (
                <div className="admin-promo-product-picker">
                  <input
                    className="admin-input"
                    placeholder="Buscar produto..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    autoFocus
                  />
                  <div className="admin-promo-product-picker-list">
                    {filteredProducts.length === 0 ? (
                      <p className="admin-help-text">Nenhum produto encontrado.</p>
                    ) : (
                      filteredProducts.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className={`admin-promo-product-option ${draft.produtoId === p.id ? 'active' : ''}`}
                          onClick={() => onSelectProduct(p.id)}
                        >
                          <ProductThumb product={p} size={48} />
                          <div>
                            <strong>{p.nome}</strong>
                            {p.descricao ? <p>{p.descricao}</p> : null}
                          </div>
                          <span>{formatCurrency(p.preco)}</span>
                        </button>
                      ))
                    )}
                  </div>
                  <button
                    type="button"
                    className="admin-text-btn admin-promo-picker-close"
                    onClick={() => setPickerOpen(false)}
                  >
                    Fechar
                  </button>
                </div>
              ) : null}
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Valor original</label>
              <input
                className="admin-input"
                value={draft.valorOriginal}
                onChange={(e) => setDraft((d) => ({ ...d, valorOriginal: e.target.value }))}
                placeholder="R$ 0,00"
              />
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Valor promocional</label>
              <input
                className="admin-input"
                value={draft.valorPromocional}
                onChange={(e) => setDraft((d) => ({ ...d, valorPromocional: e.target.value }))}
                placeholder="R$ 0,00"
              />
            </div>
          </div>
          <div className="admin-delivery-area-form-actions">
            <button type="button" className="admin-btn" onClick={resetForm}>
              Cancelar
            </button>
            <button type="submit" className="admin-btn admin-btn-primary">
              {editingId ? 'Salvar alterações' : 'Cadastrar promoção'}
            </button>
          </div>
        </form>
      ) : null}

      {promocoes.length === 0 ? (
        <p className="admin-help-text admin-delivery-areas-empty">Nenhuma promoção cadastrada.</p>
      ) : (
        <div className="admin-sparse-list">
          {promocoes.map((promo) => {
            const product = productById(promo.produtoId);
            return (
              <div key={promo.id} className="admin-sparse-row admin-sparse-row-media">
                <ProductThumb product={product} size={48} />
                <div className="admin-sparse-row-main">
                  <span className="admin-sparse-row-code">{productName(promo.produtoId)}</span>
                  <span className="admin-sparse-row-sep" aria-hidden="true">
                    ·
                  </span>
                  <span className="admin-sparse-row-detail">
                    De {formatCurrency(promo.valorOriginal)} por{' '}
                    <strong>{formatCurrency(promo.valorPromocional)}</strong>
                  </span>
                </div>
                <div className="admin-sparse-row-actions">
                  <div className="admin-availability-cell">
                    <span>Disponível</span>
                    <AdminAvailabilitySwitch
                      checked={promo.ativo !== false}
                      label={`Alterar disponibilidade da promoção ${productName(promo.produtoId)}`}
                      onChange={() => handleToggle(promo)}
                    />
                  </div>
                  <button type="button" className="admin-link-btn" onClick={() => startEdit(promo)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="admin-link-btn admin-link-btn-danger"
                    onClick={() => handleDelete(promo.id)}
                  >
                    Remover
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
