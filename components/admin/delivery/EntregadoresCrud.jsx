'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminAvailabilitySwitch from '@/components/admin/AdminAvailabilitySwitch';
import { AdminListSkeleton } from '@/components/admin/AdminSkeleton';
import { useAdminToast } from '@/context/AdminToastContext';
import { isEntregadorWhatsAppValid } from '@/lib/delivery/routeShareMessage';
import {
  createEntregador,
  deleteEntregador,
  listEntregadoresByEmpresaId,
  updateEntregador,
} from '@/lib/supabase/entregadores';

function emptyDraft() {
  return { nome: '', telefone: '' };
}

function formatPhoneInput(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  const ddd = digits.slice(0, 2);
  const ninth = digits.slice(2, 3);
  const part1 = digits.slice(3, 7);
  const part2 = digits.slice(7, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${ddd}`;
  if (digits.length <= 3) return `(${ddd}) ${ninth}`;
  if (digits.length <= 7) return `(${ddd}) ${ninth} ${digits.slice(3)}`;
  return `(${ddd}) ${ninth} ${part1}${part2 ? `-${part2}` : ''}`;
}

export default function EntregadoresCrud({ empresaId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useAdminToast();
  const [draft, setDraft] = useState(emptyDraft());
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    if (!empresaId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await listEntregadoresByEmpresaId(empresaId);
      setItems(rows);
    } catch (e) {
      toast.error(e?.message || 'Erro ao carregar entregadores.');
    } finally {
      setLoading(false);
    }
  }, [empresaId, toast]);

  useEffect(() => {
    load();
  }, [load]);

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
    if (!empresaId) return;
    const nome = draft.nome.trim();
    if (!nome) {
      toast.error('Informe o nome do entregador.');
      return;
    }
    if (!isEntregadorWhatsAppValid(draft.telefone)) {
      toast.error('Informe o WhatsApp com DDD e 11 dígitos (ex.: 11 9 8765-4321).');
      return;
    }
    try {
      if (editingId) {
        const current = items.find((item) => item.id === editingId);
        await updateEntregador(editingId, {
          nome,
          telefone: draft.telefone,
          ativo: current?.ativo !== false,
        });
      } else {
        await createEntregador(empresaId, {
          nome,
          telefone: draft.telefone,
          ativo: true,
        });
      }
      resetForm();
      await load();
      toast.success(editingId ? 'Entregador atualizado.' : 'Entregador cadastrado.');
    } catch (err) {
      toast.error(err?.message || 'Erro ao salvar entregador.');
    }
  }

  async function handleToggle(item) {
    try {
      await updateEntregador(item.id, { ativo: !item.ativo });
      await load();
    } catch (e) {
      toast.error(e?.message || 'Erro ao atualizar disponibilidade.');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Remover este entregador? Pedidos e rotas antigas mantêm o histórico se possível.')) {
      return;
    }
    try {
      await deleteEntregador(id);
      if (editingId === id) resetForm();
      await load();
      toast.success('Entregador removido.');
    } catch (e) {
      toast.error(e?.message || 'Erro ao remover entregador.');
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setDraft({
      nome: item.nome || '',
      telefone: formatPhoneInput(item.telefone || ''),
    });
    setFormOpen(true);
  }

  if (!empresaId) {
    return (
      <p className="admin-help-text">
        Configure o slug da loja em Minha loja e vincule a empresa no Supabase para gerenciar
        entregadores.
      </p>
    );
  }

  return (
    <div className="admin-delivery-areas">
      <div className="admin-delivery-areas-toolbar">
        <p className="admin-help-text admin-delivery-areas-hint">
          Cadastre quem entrega para a loja. Ao criar uma rota, escolha o entregador responsável.
        </p>
        <button type="button" className="admin-btn admin-btn-primary" onClick={openNewForm}>
          + Novo entregador
        </button>
      </div>

      {formOpen ? (
        <form className="admin-delivery-area-form admin-card" onSubmit={handleSave}>
          <h3 className="admin-delivery-area-form-title">
            {editingId ? 'Editar entregador' : 'Novo entregador'}
          </h3>
          <div className="admin-delivery-zone-form-grid admin-entregador-form-grid">
            <div className="admin-form-group">
              <label className="admin-label">Nome</label>
              <input
                className="admin-input"
                value={draft.nome}
                onChange={(e) => setDraft((d) => ({ ...d, nome: e.target.value }))}
                placeholder="Ex: João"
                autoFocus
              />
            </div>
            <div className="admin-form-group">
              <label className="admin-label">WhatsApp</label>
              <input
                className="admin-input"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                value={draft.telefone}
                onChange={(e) => setDraft((d) => ({ ...d, telefone: formatPhoneInput(e.target.value) }))}
                placeholder="(11) 9 8765-4321"
                required
              />
              <p className="admin-help-text">Obrigatório, com 11 dígitos (DDD + 9 + número).</p>
            </div>
          </div>
          <div className="admin-delivery-area-form-actions">
            <button type="button" className="admin-btn" onClick={resetForm}>
              Cancelar
            </button>
            <button type="submit" className="admin-btn admin-btn-primary">
              {editingId ? 'Salvar alterações' : 'Cadastrar'}
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <AdminListSkeleton rows={3} />
      ) : items.length === 0 ? (
        <p className="admin-help-text admin-delivery-areas-empty">Nenhum entregador cadastrado.</p>
      ) : (
        <div className="admin-sparse-list">
          {items.map((item) => (
            <div key={item.id} className="admin-sparse-row admin-crud-list-row">
              <div className="admin-sparse-row-main admin-sparse-row-main-stack">
                <span className="admin-sparse-row-code">{item.nome}</span>
                <span className="admin-sparse-row-detail">
                  {isEntregadorWhatsAppValid(item.telefone)
                    ? item.telefone
                    : item.telefone
                      ? 'WhatsApp incompleto — edite para 11 dígitos'
                      : 'Sem WhatsApp — cadastre para criar rotas'}
                </span>
              </div>
              <div className="admin-sparse-row-actions admin-item-actions-col">
                <div className="admin-availability-cell">
                  <span>Disponível</span>
                  <AdminAvailabilitySwitch
                    checked={item.ativo !== false}
                    label={`Alterar disponibilidade de ${item.nome}`}
                    onChange={() => handleToggle(item)}
                  />
                </div>
                <button type="button" className="admin-link-btn" onClick={() => startEdit(item)}>
                  Editar
                </button>
                <button
                  type="button"
                  className="admin-link-btn admin-link-btn-danger"
                  onClick={() => handleDelete(item.id)}
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
