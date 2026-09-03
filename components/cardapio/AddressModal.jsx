'use client';

import { useEffect, useRef } from 'react';
import { useCardapio } from '@/context/CardapioContext';
import PublicAddressStreetInput from '@/components/cardapio/PublicAddressStreetInput';
import { IconClose } from './icons';

export default function AddressModal() {
  const numInputRef = useRef(null);
  const {
    addressOpen,
    closeAddressPopup,
    openCepPopup,
    addrForm,
    setAddrForm,
    confirmAddress,
    addressFlowContext,
    markAddressLookupAsStreet,
    storeConfig,
    slug,
    effectiveSlug,
  } = useCardapio();

  const storeSlug = String(storeConfig?.slug || effectiveSlug || slug || '')
    .trim()
    .toLowerCase();
  const isDeliveryCheck = addressFlowContext === 'deliveryCheck';
  const streetLocked = Boolean(addrForm.streetSelected);
  const missingBairro = streetLocked && !String(addrForm.bairro || '').trim();

  const handleOverlayClick = (e) => {
    if (e.target.id === 'addressOverlay') closeAddressPopup();
  };

  const update = (field) => (e) =>
    setAddrForm((f) => ({ ...f, [field]: e.target.value }));

  function handleStreetSelect(address) {
    markAddressLookupAsStreet();
    setAddrForm((f) => ({
      ...f,
      rua: address.logradouro || f.rua,
      num: '',
      bairro: address.bairro || f.bairro,
      cidade: address.cidade || f.cidade,
      estado: address.estado || f.estado,
      cep: address.cep || f.cep,
      latitude: Number.isFinite(Number(address.latitude)) ? Number(address.latitude) : null,
      longitude: Number.isFinite(Number(address.longitude)) ? Number(address.longitude) : null,
      streetSelected: true,
    }));
    requestAnimationFrame(() => numInputRef.current?.focus());
  }

  function handleStreetChange(value) {
    setAddrForm((f) => ({
      ...f,
      rua: value,
      streetSelected: false,
      latitude: null,
      longitude: null,
      bairro: '',
      cidade: f.cidade || storeConfig.enderecoCidade || '',
      estado: f.estado || storeConfig.enderecoEstado || '',
      cep: '',
    }));
  }

  useEffect(() => {
    if (!addressOpen) return undefined;
    const id = window.requestAnimationFrame(() => {
      if (addrForm.streetSelected) {
        numInputRef.current?.focus();
      }
    });
    return () => window.cancelAnimationFrame(id);
  }, [addressOpen, addrForm.streetSelected]);

  return (
    <div
      className={`generic-overlay ${addressOpen ? 'open' : ''}`}
      id="addressOverlay"
      onClick={handleOverlayClick}
    >
      <div className="modal-card">
        <div className="modal-topbar">
          <div style={{ width: 30 }} />
          <div className="modal-topbar-title">
            {isDeliveryCheck ? 'Verificar entrega' : 'Endereço de entrega'}
          </div>
          <button type="button" className="modal-close" onClick={closeAddressPopup}>
            <IconClose />
          </button>
        </div>
        <div className="modal-body address-modal-body">
          {streetLocked ? (
            <div className="cardapio-address-selected-line">
              <p className="cardapio-address-selected-text">
                {[addrForm.rua, addrForm.bairro, addrForm.cidade, addrForm.estado]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <button
                type="button"
                className="cardapio-address-change-btn"
                onClick={() =>
                  setAddrForm((f) => ({
                    ...f,
                    rua: '',
                    num: '',
                    bairro: '',
                    cep: '',
                    comp: f.comp,
                    latitude: null,
                    longitude: null,
                    streetSelected: false,
                  }))
                }
              >
                Alterar
              </button>
            </div>
          ) : (
            <div className="cardapio-address-form-group">
              <PublicAddressStreetInput
                slug={storeSlug}
                value={addrForm.rua}
                onChange={handleStreetChange}
                onAddressSelect={handleStreetSelect}
                inputClassName="form-input"
                placeholder="Rua ou avenida *"
              />
              <p className="cardapio-address-autocomplete-hint">
                Digite ao menos 3 letras e selecione sua rua na lista.
              </p>
            </div>
          )}

          {streetLocked ? (
            <>
              <div className="address-grid-num-bairro">
                <input
                  ref={numInputRef}
                  className="form-input"
                  type="text"
                  placeholder="Nº *"
                  value={addrForm.num}
                  onChange={update('num')}
                />
                <input
                  className={`form-input${missingBairro ? '' : ' form-input-readonly'}`}
                  type="text"
                  placeholder="Bairro *"
                  value={addrForm.bairro}
                  onChange={update('bairro')}
                  readOnly={!missingBairro}
                />
              </div>

              <div className="address-grid-state" style={{ marginBottom: 10 }}>
                <input
                  className="form-input form-input-readonly"
                  type="text"
                  placeholder="Cidade"
                  value={addrForm.cidade}
                  readOnly
                />
                <input
                  className="form-input form-input-readonly"
                  type="text"
                  placeholder="UF"
                  value={addrForm.estado}
                  readOnly
                />
              </div>

              {addrForm.cep ? (
                <p className="cardapio-address-cep-line">CEP {addrForm.cep}</p>
              ) : null}

              <div style={{ marginBottom: 10 }}>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Complemento (opcional)"
                  style={{ width: '100%' }}
                  value={addrForm.comp}
                  onChange={update('comp')}
                />
              </div>
            </>
          ) : null}
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="btn-modal-back"
            onClick={() => {
              closeAddressPopup();
              openCepPopup();
            }}
          >
            VOLTAR
          </button>
          <button
            type="button"
            className="btn-modal-confirm"
            onClick={confirmAddress}
            disabled={!streetLocked}
          >
            {isDeliveryCheck ? 'VERIFICAR' : 'CONFIRMAR'}
          </button>
        </div>
      </div>
    </div>
  );
}
