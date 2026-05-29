'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatCep } from '@/lib/cep/viacep';
import { useCepLookup } from '@/hooks/useCepLookup';
import { useEmpresa } from '@/hooks/useEmpresa';
import {
  createCustomer,
  deleteCliente,
  deleteClienteEndereco,
  listClienteEnderecos,
  listClientes,
  listPedidosByCliente,
  updateCliente,
  upsertClienteEndereco,
} from '@/lib/supabase/customers';

function money(v) {
  return `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
}

function fmtPhone(v) {
  const n = String(v || '').replace(/\D/g, '').slice(0, 11);
  if (n.length <= 2) return n;
  if (n.length <= 7) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}

const EMPTY_NEW = {
  name: '',
  phone: '',
  cep: '',
  street: '',
  number: '',
  district: '',
  city: '',
  state: '',
};

function CepSearchButton({ onLookup, cep, disabled }) {
  return (
    <button
      type="button"
      className="admin-btn admin-btn-ghost"
      style={{ padding: '8px 10px' }}
      title="Buscar CEP"
      disabled={disabled}
      onClick={() => onLookup(cep)}
      aria-label="Buscar CEP"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
        <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" />
      </svg>
    </button>
  );
}

export default function ClientesPage() {
  const { empresaId, loading: empresaLoading, error: empresaError } = useEmpresa();
  const { lookup: lookupCep, loading: cepLoading, error: cepError, clearError: clearCepError } = useCepLookup();

  const [customers, setCustomers] = useState([]);
  const [ordersByCustomer, setOrdersByCustomer] = useState({});
  const [addressesByCustomer, setAddressesByCustomer] = useState({});
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [tab, setTab] = useState('dados');
  const [newDraft, setNewDraft] = useState(EMPTY_NEW);
  const [msg, setMsg] = useState('');

  const loadAll = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const clientes = await listClientes(empresaId);
      setCustomers(clientes);

      const oMap = {};
      const aMap = {};
      await Promise.all(
        clientes.map(async (c) => {
          const [pedidos, enderecos] = await Promise.all([
            listPedidosByCliente(c.id, empresaId),
            listClienteEnderecos(c.id, empresaId),
          ]);
          oMap[c.id] = pedidos;
          aMap[c.id] = enderecos;
        })
      );
      setOrdersByCustomer(oMap);
      setAddressesByCustomer(aMap);
    } catch (e) {
      setMsg(e?.message || 'Erro ao carregar clientes.');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    if (!empresaId) return;
    loadAll();
  }, [empresaId, loadAll]);

  async function handleNewCepLookup() {
    clearCepError();
    const result = await lookupCep(newDraft.cep);
    if (!result) return;
    setNewDraft((d) => ({
      ...d,
      street: result.logradouro || d.street,
      district: result.bairro || d.district,
      city: result.cidade || d.city,
      state: result.estado || d.state,
    }));
  }

  async function saveNew() {
    if (!newDraft.name.trim() || !newDraft.phone.trim()) {
      setMsg('Nome e telefone são obrigatórios.');
      return;
    }
    try {
      await createCustomer({
        name: newDraft.name,
        phone: newDraft.phone,
        empresaId,
        address: {
          cep: newDraft.cep,
          street: newDraft.street,
          number: newDraft.number,
          district: newDraft.district,
          city: newDraft.city,
          state: newDraft.state,
        },
      });
      setMsg('Cliente criado com sucesso.');
      setNewOpen(false);
      setNewDraft(EMPTY_NEW);
      loadAll();
    } catch (e) {
      setMsg(`Erro ao criar cliente: ${e.message}`);
    }
  }

  async function saveDetail() {
    if (!detail || !empresaId) return;
    try {
      await updateCliente({
        id: detail.id,
        name: detail.name,
        phone: detail.phone,
        empresaId,
      });
      setMsg('Cliente atualizado.');
      loadAll();
    } catch (e) {
      setMsg(`Erro ao salvar: ${e.message}`);
    }
  }

  async function handleDeleteCustomer(id) {
    if (!window.confirm('Excluir cliente?')) return;
    try {
      await deleteCliente(id, empresaId);
      setMsg('Cliente excluído.');
      if (detail?.id === id) setDetail(null);
      loadAll();
    } catch (e) {
      setMsg(`Erro ao excluir: ${e.message}`);
    }
  }

  async function addAddress() {
    if (!detail || !empresaId) return;
    try {
      await upsertClienteEndereco({
        clienteId: detail.id,
        empresaId,
        patch: {
          cep: '',
          street: '',
          number: '',
          district: '',
          city: '',
          state: '',
          principal: !(addressesByCustomer[detail.id] || []).length,
        },
      });
      const enderecos = await listClienteEnderecos(detail.id, empresaId);
      setAddressesByCustomer((prev) => ({ ...prev, [detail.id]: enderecos }));
      setMsg('Endereço adicionado. Preencha os campos e salve.');
    } catch (e) {
      setMsg(`Erro ao adicionar endereço: ${e.message}`);
    }
  }

  function patchAddressLocal(clienteId, addressId, field, value) {
    setAddressesByCustomer((prev) => ({
      ...prev,
      [clienteId]: (prev[clienteId] || []).map((a) => (a.id === addressId ? { ...a, [field]: value } : a)),
    }));
  }

  async function saveAddress(clienteId, address) {
    if (!empresaId) return;
    try {
      await upsertClienteEndereco({
        id: address.id,
        clienteId,
        empresaId,
        patch: address,
      });
      setMsg('Endereço salvo.');
      const enderecos = await listClienteEnderecos(clienteId, empresaId);
      setAddressesByCustomer((prev) => ({ ...prev, [clienteId]: enderecos }));
    } catch (e) {
      setMsg(`Erro ao salvar endereço: ${e.message}`);
    }
  }

  async function handleAddressCepLookup(clienteId, address) {
    clearCepError();
    const result = await lookupCep(address.cep);
    if (!result) return;
    const patched = {
      ...address,
      street: result.logradouro || address.street,
      district: result.bairro || address.district,
      city: result.cidade || address.city,
      state: result.estado || address.state,
    };
    setAddressesByCustomer((prev) => ({
      ...prev,
      [clienteId]: (prev[clienteId] || []).map((a) => (a.id === address.id ? patched : a)),
    }));
  }

  async function removeAddress(clienteId, addressId) {
    if (!window.confirm('Remover este endereço?')) return;
    try {
      await deleteClienteEndereco(addressId, empresaId);
      setAddressesByCustomer((prev) => ({
        ...prev,
        [clienteId]: (prev[clienteId] || []).filter((a) => a.id !== addressId),
      }));
      setMsg('Endereço removido.');
    } catch (e) {
      setMsg(`Erro ao remover endereço: ${e.message}`);
    }
  }

  if (empresaLoading) {
    return (
      <div className="admin-content admin-content-pedidos">
        <div className="admin-order-meta">Carregando empresa...</div>
      </div>
    );
  }

  if (empresaError || !empresaId) {
    return (
      <div className="admin-content admin-content-pedidos">
        <div className="admin-store-message">{empresaError || 'Empresa não encontrada.'}</div>
      </div>
    );
  }

  return (
    <div className="admin-content admin-content-pedidos">
      {msg ? <div className="admin-store-message">{msg}</div> : null}
      {cepError ? <div className="admin-store-message">{cepError}</div> : null}

      <div className="admin-store-actions-row">
        <div className="admin-page-title">Clientes</div>
        <button type="button" className="admin-btn admin-btn-primary" onClick={() => setNewOpen(true)}>
          + Novo cliente
        </button>
      </div>

      <div className="admin-card">
        {loading ? (
          <div className="admin-order-meta">Carregando clientes...</div>
        ) : customers.length === 0 ? (
          <div className="admin-order-meta">Nenhum cliente cadastrado.</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {customers.map((c) => (
              <div key={c.id} className="admin-order-card" style={{ margin: 0 }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1fr 120px 140px 170px auto',
                    gap: 8,
                    alignItems: 'center',
                  }}
                >
                  <strong>{c.name}</strong>
                  <span className="admin-order-meta">{fmtPhone(c.phone)}</span>
                  <span>{c.total_orders || 0} pedidos</span>
                  <span>{money(c.total_spent)}</span>
                  <span className="admin-order-meta">
                    {c.last_order_at ? new Date(c.last_order_at).toLocaleDateString('pt-BR') : '-'}
                  </span>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="admin-btn admin-btn-ghost"
                      onClick={() => {
                        setDetail({ ...c });
                        setTab('dados');
                      }}
                    >
                      Ver detalhes
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn-ghost"
                      onClick={() => {
                        setDetail({ ...c });
                        setTab('dados');
                      }}
                    >
                      Editar
                    </button>
                    <button type="button" className="admin-btn admin-btn-danger" onClick={() => handleDeleteCustomer(c.id)}>
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {newOpen ? (
        <div className="admin-confirm-overlay" onClick={() => setNewOpen(false)}>
          <div className="admin-confirm-modal" style={{ width: 'min(560px, 96vw)' }} onClick={(e) => e.stopPropagation()}>
            <h3>Novo cliente</h3>
            <div className="admin-form-group">
              <label className="admin-label">Nome *</label>
              <input
                className="admin-input"
                value={newDraft.name}
                onChange={(e) => setNewDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Telefone *</label>
              <input
                className="admin-input"
                value={newDraft.phone}
                onChange={(e) => setNewDraft((d) => ({ ...d, phone: fmtPhone(e.target.value) }))}
              />
            </div>
            <p className="admin-help-text" style={{ marginTop: 16 }}>
              Endereço (opcional)
            </p>
            <div className="admin-form-group">
              <label className="admin-label">CEP</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                <input
                  className="admin-input"
                  value={newDraft.cep}
                  onChange={(e) => setNewDraft((d) => ({ ...d, cep: formatCep(e.target.value) }))}
                  placeholder="00000-000"
                />
                <CepSearchButton onLookup={handleNewCepLookup} cep={newDraft.cep} disabled={cepLoading} />
              </div>
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Endereço</label>
              <input
                className="admin-input"
                value={newDraft.street}
                onChange={(e) => setNewDraft((d) => ({ ...d, street: e.target.value }))}
              />
            </div>
            <div className="admin-store-form-grid" style={{ padding: 0, gridTemplateColumns: '1fr 1fr 1fr' }}>
              <div className="admin-form-group">
                <label className="admin-label">Número</label>
                <input
                  className="admin-input"
                  value={newDraft.number}
                  onChange={(e) => setNewDraft((d) => ({ ...d, number: e.target.value }))}
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-label">Bairro</label>
                <input
                  className="admin-input"
                  value={newDraft.district}
                  onChange={(e) => setNewDraft((d) => ({ ...d, district: e.target.value }))}
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-label">Cidade</label>
                <input
                  className="admin-input"
                  value={newDraft.city}
                  onChange={(e) => setNewDraft((d) => ({ ...d, city: e.target.value }))}
                />
              </div>
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Estado</label>
              <input
                className="admin-input"
                value={newDraft.state}
                onChange={(e) => setNewDraft((d) => ({ ...d, state: e.target.value }))}
                maxLength={2}
                placeholder="SP"
              />
            </div>
            <div className="admin-confirm-actions">
              <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setNewOpen(false)}>
                Cancelar
              </button>
              <button type="button" className="admin-btn admin-btn-primary" onClick={saveNew}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {detail ? (
        <div className="admin-confirm-overlay" onClick={() => setDetail(null)}>
          <div
            className="admin-confirm-modal"
            style={{ width: 'min(900px, 96vw)', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>{detail.name}</h3>
            <div className="admin-tabs admin-tabs-pedidos">
              <button type="button" className={`admin-tab ${tab === 'dados' ? 'active' : ''}`} onClick={() => setTab('dados')}>
                Dados
              </button>
              <button type="button" className={`admin-tab ${tab === 'enderecos' ? 'active' : ''}`} onClick={() => setTab('enderecos')}>
                Endereços
              </button>
              <button type="button" className={`admin-tab ${tab === 'historico' ? 'active' : ''}`} onClick={() => setTab('historico')}>
                Histórico
              </button>
            </div>

            {tab === 'dados' ? (
              <>
                <div className="admin-form-group">
                  <label className="admin-label">Nome</label>
                  <input
                    className="admin-input"
                    value={detail.name || ''}
                    onChange={(e) => setDetail((d) => ({ ...d, name: e.target.value }))}
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">Telefone</label>
                  <input
                    className="admin-input"
                    value={detail.phone || ''}
                    onChange={(e) => setDetail((d) => ({ ...d, phone: fmtPhone(e.target.value) }))}
                  />
                </div>
                <div className="admin-confirm-actions">
                  <button type="button" className="admin-btn admin-btn-primary" onClick={saveDetail}>
                    Salvar
                  </button>
                </div>
              </>
            ) : null}

            {tab === 'enderecos' ? (
              <>
                <button type="button" className="admin-btn admin-btn-ghost" onClick={addAddress}>
                  + Adicionar endereço
                </button>
                <div style={{ marginTop: 10, display: 'grid', gap: 12 }}>
                  {(addressesByCustomer[detail.id] || []).length === 0 ? (
                    <p className="admin-order-meta">Nenhum endereço cadastrado.</p>
                  ) : null}
                  {(addressesByCustomer[detail.id] || []).map((a) => (
                    <div key={a.id} className="admin-card">
                      <div className="admin-form-group">
                        <label className="admin-label">CEP</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                          <input
                            className="admin-input"
                            value={a.cep}
                            onChange={(e) => patchAddressLocal(detail.id, a.id, 'cep', formatCep(e.target.value))}
                          />
                          <CepSearchButton
                            onLookup={() => handleAddressCepLookup(detail.id, a)}
                            cep={a.cep}
                            disabled={cepLoading}
                          />
                        </div>
                      </div>
                      <div className="admin-form-group">
                        <label className="admin-label">Endereço</label>
                        <input
                          className="admin-input"
                          value={a.street}
                          onChange={(e) => patchAddressLocal(detail.id, a.id, 'street', e.target.value)}
                        />
                      </div>
                      <div className="admin-store-form-grid" style={{ padding: 0, gridTemplateColumns: '1fr 1fr 1fr' }}>
                        <div className="admin-form-group">
                          <label className="admin-label">Número</label>
                          <input
                            className="admin-input"
                            value={a.number}
                            onChange={(e) => patchAddressLocal(detail.id, a.id, 'number', e.target.value)}
                          />
                        </div>
                        <div className="admin-form-group">
                          <label className="admin-label">Bairro</label>
                          <input
                            className="admin-input"
                            value={a.district}
                            onChange={(e) => patchAddressLocal(detail.id, a.id, 'district', e.target.value)}
                          />
                        </div>
                        <div className="admin-form-group">
                          <label className="admin-label">Cidade</label>
                          <input
                            className="admin-input"
                            value={a.city}
                            onChange={(e) => patchAddressLocal(detail.id, a.id, 'city', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="admin-form-group">
                        <label className="admin-label">Estado</label>
                        <input
                          className="admin-input"
                          value={a.state}
                          maxLength={2}
                          onChange={(e) => patchAddressLocal(detail.id, a.id, 'state', e.target.value.toUpperCase())}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button type="button" className="admin-btn admin-btn-primary" onClick={() => saveAddress(detail.id, a)}>
                          Salvar endereço
                        </button>
                        <button type="button" className="admin-btn admin-btn-danger" onClick={() => removeAddress(detail.id, a.id)}>
                          Remover
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {tab === 'historico' ? (
              <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                {(ordersByCustomer[detail.id] || []).length === 0 ? (
                  <p className="admin-order-meta">Nenhum pedido encontrado para este cliente.</p>
                ) : null}
                {(ordersByCustomer[detail.id] || []).map((o) => (
                  <div key={o.rawId} className="admin-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>Pedido #{o.id}</strong>
                      <strong>{money(o.total)}</strong>
                    </div>
                    <div className="admin-order-meta">
                      {o.statusLabel} · {new Date(o.created_at).toLocaleString('pt-BR')}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="admin-confirm-actions">
              <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setDetail(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
