'use client';

import { useEffect, useRef, useState } from 'react';
import { formatCep } from '@/lib/cep/viacep';
import { useCepLookup } from '@/hooks/useCepLookup';
import AddressAutocompleteInput from './AddressAutocompleteInput';
import AdminIcon from '@/components/admin/AdminIcon';

function snapshotAddress(draft) {
  return {
    cep: draft?.cep || '',
    logradouro: draft?.logradouro || '',
    numero: draft?.numero || '',
    bairro: draft?.bairro || '',
    cidade: draft?.cidade || '',
    estado: draft?.estado || '',
    complemento: draft?.complemento || '',
  };
}

export default function OrderAddressModal({ draft, slug, onClose, onConfirm }) {
  const numeroInputRef = useRef(null);
  const [local, setLocal] = useState(() => snapshotAddress(draft));
  const { lookup, loading: cepLoading } = useCepLookup();

  useEffect(() => {
    function onKey(e) {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      e.preventDefault();
      onClose();
    }
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  function setField(field, value) {
    setLocal((d) => ({ ...d, [field]: value }));
  }

  async function handleCepSearch() {
    const result = await lookup(local.cep);
    if (!result) return;
    setLocal((d) => ({
      ...d,
      logradouro: result.logradouro || d.logradouro,
      bairro: result.bairro || d.bairro,
      cidade: result.cidade || d.cidade,
      estado: result.estado || d.estado,
    }));
  }

  function handleAddressSelect(address) {
    setLocal((d) => ({
      ...d,
      logradouro: address.logradouro,
      numero: '',
      bairro: address.bairro,
      cidade: address.cidade,
      estado: address.estado,
      cep: formatCep(address.cep),
    }));
    requestAnimationFrame(() => numeroInputRef.current?.focus());
  }

  return (
    <div
      className="admin-confirm-overlay admin-order-aux-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="admin-confirm-modal admin-order-aux-modal admin-order-address-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-address-modal-title"
      >
        <div className="admin-order-aux-modal-head">
          <h3 id="order-address-modal-title">Endereço de entrega</h3>
          <button type="button" className="admin-order-aux-close" onClick={onClose} aria-label="Fechar">
            <AdminIcon name="close" />
          </button>
        </div>

        <div className="admin-order-aux-modal-body">
          <div className="admin-form-group admin-order-cep-row">
            <label className="admin-label">CEP</label>
            <div className="admin-input-icon-wrap">
              <input
                className="admin-input admin-input-with-icon"
                value={local.cep}
                onChange={(e) => setField('cep', formatCep(e.target.value))}
                placeholder="00000-000"
              />
              <button
                type="button"
                className="admin-input-icon-btn"
                onClick={handleCepSearch}
                disabled={cepLoading}
                title="Buscar CEP"
                aria-label="Buscar CEP"
              >
                <AdminIcon name="search" />
              </button>
            </div>
          </div>

          <div className="admin-form-group">
            <label className="admin-label">Rua ou avenida</label>
            <AddressAutocompleteInput
              slug={slug}
              value={local.logradouro}
              onChange={(logradouro) => setField('logradouro', logradouro)}
              onAddressSelect={handleAddressSelect}
            />
            <small className="admin-address-autocomplete-hint">
              Digite ao menos 3 letras e selecione uma sugestão.
            </small>
          </div>

          <div className="admin-order-address-grid admin-order-address-grid-row">
            <div className="admin-form-group admin-order-field-numero">
              <label className="admin-label">Número</label>
              <input
                ref={numeroInputRef}
                className="admin-input"
                value={local.numero}
                onChange={(e) => setField('numero', e.target.value)}
                placeholder="124"
              />
            </div>
            <div className="admin-form-group admin-order-field-bairro">
              <label className="admin-label">Bairro</label>
              <input
                className="admin-input"
                value={local.bairro}
                onChange={(e) => setField('bairro', e.target.value)}
                placeholder="Centro"
              />
            </div>
          </div>
          <div className="admin-order-address-grid admin-order-address-grid-row admin-order-address-grid-row-city">
            <div className="admin-form-group admin-order-field-cidade">
              <label className="admin-label">Cidade</label>
              <input
                className="admin-input"
                value={local.cidade}
                onChange={(e) => setField('cidade', e.target.value)}
                placeholder="São Paulo"
              />
            </div>
            <div className="admin-form-group admin-order-field-estado">
              <label className="admin-label">Estado</label>
              <input
                className="admin-input"
                value={local.estado}
                onChange={(e) => setField('estado', e.target.value.toUpperCase().slice(0, 2))}
                maxLength={2}
                placeholder="SP"
              />
            </div>
          </div>

          <div className="admin-form-group">
            <label className="admin-label">Complemento</label>
            <input
              className="admin-input"
              value={local.complemento}
              onChange={(e) => setField('complemento', e.target.value)}
              placeholder="Apto, bloco, referência..."
            />
          </div>
        </div>

        <div className="admin-order-aux-modal-footer">
          <button type="button" className="admin-btn admin-btn-outline admin-order-aux-cancel" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="admin-btn admin-btn-primary" onClick={() => onConfirm(local)}>
            Confirmar endereço
          </button>
        </div>
      </div>
    </div>
  );
}
