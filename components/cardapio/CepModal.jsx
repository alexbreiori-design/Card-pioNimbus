'use client';

import { useCardapio } from '@/context/CardapioContext';
import { IconClose } from './icons';

export default function CepModal() {
  const {
    cepOpen,
    closeCepPopup,
    cepValue,
    setCepValue,
    maskCep,
    goToAddress,
    cepInputRef,
  } = useCardapio();

  const handleOverlayClick = (e) => {
    if (e.target.id === 'cepOverlay') closeCepPopup();
  };

  return (
    <div
      className={`generic-overlay ${cepOpen ? 'open' : ''}`}
      id="cepOverlay"
      onClick={handleOverlayClick}
    >
      <div className="modal-card">
        <div className="modal-topbar">
          <div style={{ width: 30 }} />
          <div className="modal-topbar-title">Endereço de entrega</div>
          <button type="button" className="modal-close" onClick={closeCepPopup}>
            <IconClose />
          </button>
        </div>
        <div className="modal-body">
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-mid)', fontWeight: 300, marginBottom: 28 }}>
            Informe seu CEP para verificarmos se entregamos em sua região
          </p>
          <div className="cep-input-wrap">
            <input
              ref={cepInputRef}
              className="cep-input"
              type="text"
              placeholder="00000-000"
              maxLength={9}
              value={cepValue}
              onChange={(e) => setCepValue(maskCep(e.target.value))}
            />
          </div>
          <button type="button" className="btn-buscar-cep" onClick={goToAddress}>
            BUSCAR CEP
          </button>
          <a className="no-cep-link" onClick={goToAddress} role="button" tabIndex={0}>
            Não sei meu CEP
          </a>
        </div>
      </div>
    </div>
  );
}
