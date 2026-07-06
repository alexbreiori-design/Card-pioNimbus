'use client';

import { useMemo, useState } from 'react';
import AdminAvailabilitySwitch from '@/components/admin/AdminAvailabilitySwitch';
import AdminProductPickerModal from '@/components/admin/AdminProductPickerModal';
import ImagePlaceholder from '@/components/admin/ImagePlaceholder';
import { useAdminToast } from '@/context/AdminToastContext';
import { useAdminData } from '@/hooks/useAdminData';
import { buildAdminPromoProducts, buildAdminPromoCategories } from '@/lib/admin/buildAdminCatalogProducts';

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
  const produtos = useMemo(() => buildAdminPromoProducts(data), [data]);
  const toast = useAdminToast();
  const [draft, setDraft] = useState(emptyDraft());
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const selectedProduct = useMemo(
    () => produtos.find((p) => p.id === draft.produtoId) || null,
    [produtos, draft.produtoId]
  );

  const promoCategories = useMemo(
    () => buildAdminPromoCategories(data, produtos),
    [data, produtos]
  );

  function resetForm() {
    setDraft(emptyDraft());
    setEditingId(null);
    setFormOpen(false);
    setPickerOpen(false);
  }

  function openNewForm() {
    setDraft(emptyDraft());
    setEditingId(null);
    setFormOpen(true);
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
  }

  function handleSave(e) {
    e.preventDefault();
    const payload = {
      produtoId: draft.produtoId,
      valorOriginal: inputToMoney(draft.valorOriginal),
      valorPromocional: inputToMoney(draft.valorPromocional),
      ativo: true,
    };
    if (!payload.produtoId) {
      toast.error('Selecione um produto.');
      return;
    }
    if (payload.valorPromocional <= 0) {
      toast.error('Informe um valor promocional válido.');
      return;
    }
    if (payload.valorPromocional >= payload.valorOriginal) {
      toast.error('O valor promocional deve ser menor que o original.');
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
    toast.success(editingId ? 'Promoção atualizada.' : 'Promoção cadastrada.');
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
                  <ProductThumb product={selectedProduct} size={112} />
                  <div className="admin-promo-selected-product-info">
                    <strong>{selectedProduct.nome}</strong>
                    <span>{formatCurrency(selectedProduct.preco)}</span>
                  </div>
                  <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setPickerOpen(true)}>
                    Trocar
                  </button>
                </div>
              ) : (
                <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setPickerOpen(true)}>
                  Selecionar produto
                </button>
              )}
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

      {pickerOpen ? (
        <AdminProductPickerModal
          title="Selecionar produto"
          subtitle="Busque e filtre por categoria para escolher o item da promoção."
          products={produtos}
          categories={promoCategories}
          selectedId={draft.produtoId}
          onSelect={onSelectProduct}
          onClose={() => setPickerOpen(false)}
        />
      ) : null}

      {promocoes.length === 0 ? (
        <p className="admin-help-text admin-delivery-areas-empty">Nenhuma promoção cadastrada.</p>
      ) : (
        <div className="admin-sparse-list">
          {promocoes.map((promo) => {
            const product = productById(promo.produtoId);
            return (
              <div key={promo.id} className="admin-sparse-row admin-sparse-row-media admin-crud-list-row">
                <ProductThumb product={product} size={96} />
                <div className="admin-sparse-row-main admin-sparse-row-main-stack">
                  <span className="admin-sparse-row-code">{productName(promo.produtoId)}</span>
                  <span className="admin-promo-price-row">
                    <span className="admin-promo-price-old">{formatCurrency(promo.valorOriginal)}</span>
                    <span className="admin-promo-price-new">{formatCurrency(promo.valorPromocional)}</span>
                  </span>
                </div>
                <div className="admin-sparse-row-actions admin-item-actions-col">
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
