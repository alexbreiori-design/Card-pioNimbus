'use client';

import { useState } from 'react';
import AdminAvailabilitySwitch from '@/components/admin/AdminAvailabilitySwitch';
import { useAdminData } from '@/hooks/useAdminData';
import { formatCupomLabel, getCupomTipo } from '@/lib/cupons';

function uid() {
  return `cupom-${Date.now()}${Math.floor(Math.random() * 1000)}`;
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
  return { codigo: '', tipoDesconto: 'valor', valorDesconto: '', percentualDesconto: '' };
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export default function CuponsCrud() {
  const { data, saveData } = useAdminData();
  const cupons = data.cupons || [];
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

  async function handleSave(e) {
    e.preventDefault();
    setMsg('');
    const codigo = String(draft.codigo || '').trim().toUpperCase();
    const tipoDesconto = draft.tipoDesconto === 'percentual' ? 'percentual' : 'valor';
    const valorDesconto = tipoDesconto === 'valor' ? inputToMoney(draft.valorDesconto) : 0;
    const percentualDesconto =
      tipoDesconto === 'percentual' ? Number(String(draft.percentualDesconto || '').replace(',', '.')) : 0;

    if (!codigo) {
      setMsg('Informe o código do cupom.');
      return;
    }
    if (tipoDesconto === 'valor' && valorDesconto <= 0) {
      setMsg('Informe um valor de desconto válido.');
      return;
    }
    if (tipoDesconto === 'percentual' && (percentualDesconto <= 0 || percentualDesconto > 100)) {
      setMsg('Informe um percentual entre 1 e 100.');
      return;
    }
    const duplicate = cupons.some(
      (c) => c.id !== editingId && String(c.codigo || '').trim().toUpperCase() === codigo
    );
    if (duplicate) {
      setMsg('Já existe um cupom com este código.');
      return;
    }

    try {
      await saveData((prev) => {
        const payload = {
          codigo,
          tipoDesconto,
          valorDesconto: tipoDesconto === 'valor' ? valorDesconto : 0,
          percentualDesconto: tipoDesconto === 'percentual' ? percentualDesconto : 0,
          ativo: true,
        };
        if (editingId) {
          return {
            ...prev,
            cupons: prev.cupons.map((c) =>
              c.id === editingId ? { ...c, ...payload, ativo: c.ativo !== false } : c
            ),
          };
        }
        return {
          ...prev,
          cupons: [
            ...prev.cupons,
            {
              id: uid(),
              ...payload,
              ordem: prev.cupons.length,
            },
          ],
        };
      });
      resetForm();
      setMsg(editingId ? 'Cupom atualizado.' : 'Cupom cadastrado.');
      setTimeout(() => setMsg(''), 2500);
    } catch {
      setMsg('Erro ao salvar cupom no Supabase.');
    }
  }

  function handleToggle(cupom) {
    saveData((prev) => ({
      ...prev,
      cupons: prev.cupons.map((c) =>
        c.id === cupom.id ? { ...c, ativo: !c.ativo } : c
      ),
    }));
  }

  function handleDelete(id) {
    if (!window.confirm('Remover este cupom?')) return;
    saveData((prev) => ({
      ...prev,
      cupons: prev.cupons.filter((c) => c.id !== id),
    }));
    if (editingId === id) resetForm();
  }

  function startEdit(cupom) {
    setEditingId(cupom.id);
    setDraft({
      codigo: cupom.codigo,
      tipoDesconto: getCupomTipo(cupom),
      valorDesconto: moneyToInput(cupom.valorDesconto),
      percentualDesconto: String(cupom.percentualDesconto ?? cupom.valorDesconto ?? ''),
    });
    setFormOpen(true);
  }

  return (
    <div className="admin-crud-panel">
      <div className="admin-delivery-areas-toolbar">
        <p className="admin-help-text admin-delivery-areas-hint">
          Cupons disponíveis no cardápio online e no pedido manual do admin.
        </p>
        <button type="button" className="admin-btn admin-btn-primary" onClick={openNewForm}>
          + Novo cupom
        </button>
      </div>

      {msg ? <p className="admin-store-message admin-delivery-areas-msg">{msg}</p> : null}

      {formOpen ? (
        <form className="admin-delivery-area-form admin-card" onSubmit={handleSave}>
          <h3 className="admin-delivery-area-form-title">
            {editingId ? 'Editar cupom' : 'Novo cupom'}
          </h3>
          <div className="admin-promo-form-grid admin-cupom-form-grid">
            <div className="admin-form-group">
              <label className="admin-label">Código do cupom</label>
              <input
                className="admin-input"
                value={draft.codigo}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, codigo: e.target.value.toUpperCase() }))
                }
                placeholder="Ex: CUPOM10"
              />
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Tipo de desconto</label>
              <select
                className="admin-input"
                value={draft.tipoDesconto}
                onChange={(e) => setDraft((d) => ({ ...d, tipoDesconto: e.target.value }))}
              >
                <option value="valor">Valor fixo (R$)</option>
                <option value="percentual">Percentual (%)</option>
              </select>
            </div>
            <div className="admin-form-group">
              <label className="admin-label">
                {draft.tipoDesconto === 'percentual' ? 'Percentual de desconto' : 'Valor do desconto'}
              </label>
              <input
                className="admin-input"
                value={draft.tipoDesconto === 'percentual' ? draft.percentualDesconto : draft.valorDesconto}
                onChange={(e) =>
                  setDraft((d) =>
                    d.tipoDesconto === 'percentual'
                      ? { ...d, percentualDesconto: e.target.value }
                      : { ...d, valorDesconto: e.target.value }
                  )
                }
                placeholder={draft.tipoDesconto === 'percentual' ? 'Ex: 10' : 'R$ 10,00'}
              />
            </div>
          </div>
          <div className="admin-delivery-area-form-actions">
            <button type="button" className="admin-btn" onClick={resetForm}>
              Cancelar
            </button>
            <button type="submit" className="admin-btn admin-btn-primary">
              {editingId ? 'Salvar alterações' : 'Cadastrar cupom'}
            </button>
          </div>
        </form>
      ) : null}

      {cupons.length === 0 ? (
        <p className="admin-help-text admin-delivery-areas-empty">Nenhum cupom cadastrado.</p>
      ) : (
        <div className="admin-delivery-areas-list">
          {cupons.map((cupom) => (
            <div key={cupom.id} className="admin-catalog-item-row admin-delivery-area-row">
              <div className="admin-catalog-item-main">
                <div className="admin-item-title">{cupom.codigo}</div>
                <div className="admin-item-desc">Desconto: {formatCupomLabel(cupom)}</div>
              </div>
              <div className="admin-item-actions-col">
                <div className="admin-availability-cell">
                  <span>Disponível</span>
                  <AdminAvailabilitySwitch
                    checked={cupom.ativo !== false}
                    label={`Alterar disponibilidade do cupom ${cupom.codigo}`}
                    onChange={() => handleToggle(cupom)}
                  />
                </div>
                <button type="button" className="admin-link-btn" onClick={() => startEdit(cupom)}>
                  Editar
                </button>
                <button
                  type="button"
                  className="admin-link-btn"
                  style={{ color: 'var(--admin-danger, #dc2626)' }}
                  onClick={() => handleDelete(cupom.id)}
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
