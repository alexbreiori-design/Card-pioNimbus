'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { formatCep } from '@/lib/cep/viacep';
import { parseCoordinate } from '@/lib/delivery/formatAddress';
import { useAdminOverlayClose } from '@/hooks/useAdminOverlayClose';

const StoreAddressMapPin = dynamic(
  () => import('@/components/admin/loja/StoreAddressMapPin'),
  { ssr: false }
);

export default function RecalcularCoordenadasModal({
  open,
  onClose,
  addressLines,
  geocoding,
  onRecalcular,
  latitude = null,
  longitude = null,
  onSavePin,
  savingPin = false,
}) {
  const confirmRef = useRef(null);
  const parsedLatitude = parseCoordinate(latitude);
  const parsedLongitude = parseCoordinate(longitude);
  const [pinCoords, setPinCoords] = useState({
    latitude: parsedLatitude,
    longitude: parsedLongitude,
  });
  const [pinTouched, setPinTouched] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);
  const [syncedPropsKey, setSyncedPropsKey] = useState(
    () => `${parsedLatitude}:${parsedLongitude}`
  );
  const propsKey = `${parsedLatitude}:${parsedLongitude}`;

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setPinCoords({ latitude: parsedLatitude, longitude: parsedLongitude });
      setPinTouched(false);
      setSyncedPropsKey(propsKey);
    }
  } else if (open && propsKey !== syncedPropsKey) {
    setSyncedPropsKey(propsKey);
    setPinCoords({ latitude: parsedLatitude, longitude: parsedLongitude });
    setPinTouched(false);
  }
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

  const canSavePin =
    pinTouched &&
    pinCoords.latitude != null &&
    pinCoords.longitude != null &&
    typeof onSavePin === 'function';

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
          Origem das entregas. Para alterar o texto do endereço, edite em Minha loja. Aqui você pode
          recalcular ou ajustar o pin no mapa.
        </p>
        <div className="admin-delivery-address-body">
          <p className="admin-delivery-store-address-line1">{addressLines.line1}</p>
          {addressLines.line2 ? (
            <p className="admin-delivery-store-address-line2">{addressLines.line2}</p>
          ) : null}
          <StoreAddressMapPin
            latitude={pinCoords.latitude}
            longitude={pinCoords.longitude}
            loading={geocoding}
            onChange={(next) => {
              setPinCoords(next);
              setPinTouched(true);
            }}
          />
        </div>
        <div className="admin-confirm-actions admin-delivery-geocode-actions">
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>
            Fechar
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`admin-btn ${canSavePin ? 'admin-btn-ghost' : 'admin-btn-primary'}`}
            onClick={onRecalcular}
            disabled={geocoding || savingPin}
          >
            {geocoding ? 'Recalculando…' : 'Recalcular'}
          </button>
          {canSavePin ? (
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              disabled={savingPin || geocoding}
              onClick={() => onSavePin?.(pinCoords)}
            >
              {savingPin ? 'Salvando…' : 'Salvar posição'}
            </button>
          ) : null}
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
