'use client';

import { useState } from 'react';
import AdminAvailabilitySwitch from '@/components/admin/AdminAvailabilitySwitch';
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

export default function PromocoesCrud() {
  const { data, saveData } = useAdminData();
  const promocoes = data.promocoes || [];
  const produtos = (data.produtos || []).filter((p) => p.ativo !== false);
  const [msg, setMsg] = useState('');
  const [draft, setDraft] = useState(emptyDraft());
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  function resetForm() {
    setDraft(emptyDraft());
    setEditingId(null);
    setFormOpen(false);
  }

  function openNewForm() {
    setDraft(emptyDraft());
    setEditingId(null);
    setFormOpen(true);
  }

  function onSelectProduct(produtoId) {
    const product = produtos.find((p) => p.id === produtoId);
    setDraft((d) => ({
      ...d,
      produtoId,
      valorOriginal: product ? moneyToInput(product.preco) : d.valorOriginal,
    }));
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
  }

  function productName(produtoId) {
    return produtos.find((p) => p.id === produtoId)?.nome || 'Produto removido';
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
          <div className="admin-promo-form-grid">
            <div className="admin-form-group">
              <label className="admin-label">Produto</label>
              <select
                className="admin-input"
                value={draft.produtoId}
                onChange={(e) => onSelectProduct(e.target.value)}
              >
                <option value="">Selecione…</option>
                {produtos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
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
        <div className="admin-delivery-areas-list">
          {promocoes.map((promo) => (
            <div key={promo.id} className="admin-catalog-item-row admin-delivery-area-row">
              <div className="admin-catalog-item-main">
                <div className="admin-item-title">{productName(promo.produtoId)}</div>
                <div className="admin-item-desc">
                  De {formatCurrency(promo.valorOriginal)} por{' '}
                  <strong>{formatCurrency(promo.valorPromocional)}</strong>
                </div>
              </div>
              <div className="admin-item-actions-col">
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
                  className="admin-link-btn"
                  style={{ color: 'var(--admin-danger, #dc2626)' }}
                  onClick={() => handleDelete(promo.id)}
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
