'use client';

import { useEffect, useRef, useState } from 'react';
import { formatCep } from '@/lib/cep/viacep';
import { useAdminOverlayClose } from '@/hooks/useAdminOverlayClose';

export default function RecalcularCoordenadasModal({
  open,
  onClose,
  addressLines,
  geocoding,
  onRecalcular,
}) {
  const confirmRef = useRef(null);
  const { overlayPointerDown, overlayClick } = useAdminOverlayClose({
    onClose,
    isDirty: false,
  });

  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose?.();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(() => {
      confirmRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="admin-confirm-overlay admin-light-modal-overlay"
      role="presentation"
      onPointerDown={overlayPointerDown}
      onClick={overlayClick}
    >
      <div
        className="admin-confirm-modal admin-delivery-geocode-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-delivery-geocode-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="admin-delivery-geocode-title">Endereço da loja</h3>
        <p className="admin-delivery-geocode-lead">
          Origem das entregas. Para alterar o endereço, edite em Minha loja.
        </p>
        <div className="admin-delivery-address-body">
          <p className="admin-delivery-store-address-line1">{addressLines.line1}</p>
          {addressLines.line2 ? (
            <p className="admin-delivery-store-address-line2">{addressLines.line2}</p>
          ) : null}
          <p className="admin-help-text admin-delivery-address-hint">
            As coordenadas são salvas ao salvar o endereço em Minha loja. Use o botão abaixo para forçar
            uma nova consulta.
          </p>
        </div>
        <div className="admin-confirm-actions">
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>
            Fechar
          </button>
          <button
            ref={confirmRef}
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={onRecalcular}
            disabled={geocoding}
          >
            {geocoding ? 'Recalculando…' : 'Recalcular coordenadas'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function formatStoreAddressLines(loja) {
  if (!loja) {
    return { line1: '—', line2: '' };
  }

  const line1 = [
    loja.enderecoLogradouro,
    loja.enderecoNumero ? `, ${loja.enderecoNumero}` : '',
  ]
    .join('')
    .trim();

  const cityState = [loja.enderecoCidade, loja.enderecoEstado ? `/${loja.enderecoEstado}` : '']
    .filter(Boolean)
    .join('');

  const bairroCity = [loja.enderecoBairro, cityState].filter(Boolean).join(' · ');
  const cep = loja.enderecoCep ? `CEP ${formatCep(loja.enderecoCep)}` : '';
  const line2 = [bairroCity, cep].filter(Boolean).join(' · ');

  return {
    line1: line1 || loja.endereco || 'Endereço não informado.',
    line2,
  };
}

export function useDeliverySettingsMenu() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [geocodeModalOpen, setGeocodeModalOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    function onPointerDown(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [menuOpen]);

  return {
    menuRef,
    menuOpen,
    setMenuOpen,
    geocodeModalOpen,
    setGeocodeModalOpen,
  };
}
