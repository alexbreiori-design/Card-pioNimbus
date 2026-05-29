'use client';

import { useCardapio } from '@/context/CardapioContext';
import { IconClose } from './icons';

export default function AddressModal() {
  const {
    addressOpen,
    closeAddressPopup,
    openCepPopup,
    addrForm,
    setAddrForm,
    confirmAddress,
  } = useCardapio();

  const handleOverlayClick = (e) => {
    if (e.target.id === 'addressOverlay') closeAddressPopup();
  };

  const update = (field) => (e) =>
    setAddrForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div
      className={`generic-overlay ${addressOpen ? 'open' : ''}`}
      id="addressOverlay"
      onClick={handleOverlayClick}
    >
      <div className="modal-card">
        <div className="modal-topbar">
          <div style={{ width: 30 }} />
          <div className="modal-topbar-title">Endereço de entrega</div>
          <button type="button" className="modal-close" onClick={closeAddressPopup}>
            <IconClose />
          </button>
        </div>
        <div className="modal-body" style={{ paddingBottom: 12 }}>
          <div className="address-grid">
            <input
              className="form-input address-grid-full"
              type="text"
              placeholder="Rua *"
              value={addrForm.rua}
              onChange={update('rua')}
            />
            <input
              className="form-input"
              type="text"
              placeholder="Nº"
              value={addrForm.num}
              onChange={update('num')}
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <input
              className="form-input"
              type="text"
              placeholder="Bairro *"
              style={{ width: '100%' }}
              value={addrForm.bairro}
              onChange={update('bairro')}
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <input
              className="form-input"
              type="text"
              placeholder="Complemento (Apto/Bloco/Casa)"
              style={{ width: '100%' }}
              value={addrForm.comp}
              onChange={update('comp')}
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <input
              className="form-input"
              type="text"
              placeholder="Ponto de referência *"
              style={{ width: '100%' }}
              value={addrForm.ref}
              onChange={update('ref')}
            />
          </div>
          <div className="address-grid-state">
            <input
              className="form-input"
              type="text"
              placeholder="Cidade *"
              value={addrForm.cidade}
              onChange={update('cidade')}
            />
            <input
              className="form-input"
              type="text"
              placeholder="Estado *"
              style={{ textTransform: 'uppercase' }}
              value={addrForm.estado}
              onChange={update('estado')}
            />
          </div>
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
          <button type="button" className="btn-modal-confirm" onClick={confirmAddress}>
            CONFIRMAR
          </button>
        </div>
      </div>
    </div>
  );
}
