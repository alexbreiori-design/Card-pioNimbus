'use client';

import { useCallback, useState } from 'react';
import DeliveryZonesCrud from '@/components/admin/DeliveryZonesCrud';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import StoreDeliveryDurationCard from '@/components/admin/delivery/StoreDeliveryDurationCard';
import RecalcularCoordenadasModal, {
  formatStoreAddressLines,
  useDeliverySettingsMenu,
} from '@/components/admin/delivery/RecalcularCoordenadasModal';
import { useAdminToast } from '@/context/AdminToastContext';
import { useAdminData } from '@/hooks/useAdminData';
import { useEmpresa } from '@/hooks/useEmpresa';

function EntregaPageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="10" r="3" />
      <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" />
    </svg>
  );
}

export default function EntregaPage() {
  const { data, ready } = useAdminData();
  const { empresa, slug, error: empresaError } = useEmpresa();
  const loja = data?.loja;
  const toast = useAdminToast();
  const [geocoding, setGeocoding] = useState(false);
  const {
    menuRef,
    menuOpen,
    setMenuOpen,
    geocodeModalOpen,
    setGeocodeModalOpen,
  } = useDeliverySettingsMenu();

  const addressLines = formatStoreAddressLines(loja);

  const recalcularCoordenadas = useCallback(async () => {
    if (!slug || !loja) return;
    setGeocoding(true);
    try {
      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          persist: true,
          logradouro: loja.enderecoLogradouro,
          numero: loja.enderecoNumero,
          bairro: loja.enderecoBairro,
          cidade: loja.enderecoCidade,
          estado: loja.enderecoEstado,
          cep: loja.enderecoCep,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Falha no geocoding.');
      toast.success('Coordenadas da loja atualizadas com sucesso.');
      setGeocodeModalOpen(false);
    } catch (e) {
      toast.error(e?.message || 'Não foi possível recalcular as coordenadas.');
    } finally {
      setGeocoding(false);
    }
  }, [slug, loja, toast, setGeocodeModalOpen]);

  if (!ready) return null;

  return (
    <div className="admin-content admin-content-pedidos admin-catalog-page admin-section-page admin-delivery-page admin-compact-card-page">
      {empresaError ? (
        <div className="admin-card admin-store-message" style={{ color: 'var(--admin-red)' }}>
          {empresaError}
        </div>
      ) : null}

      <AdminPageHeader
        title="Entrega"
        iconNode={
          <span className="admin-page-title-icon">
            <EntregaPageIcon />
          </span>
        }
        actions={
          <div className="admin-marmita-settings-menu-wrap" ref={menuRef}>
            <button
              type="button"
              className="admin-marmita-settings-btn"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Configurações de entrega"
              aria-expanded={menuOpen}
            >
              <i className="ph ph-gear" aria-hidden="true" />
            </button>
            {menuOpen ? (
              <div className="admin-marmita-settings-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className="admin-marmita-settings-menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    setGeocodeModalOpen(true);
                  }}
                >
                  Endereço da loja
                </button>
              </div>
            ) : null}
          </div>
        }
      />

      <StoreDeliveryDurationCard />

      <div className="admin-card admin-store-block-card admin-compact-page-card">
        <div className="admin-store-section-head">
          <div className="admin-delivery-section-intro admin-delivery-section-intro--with-icon">
            <i className="ph ph-map-trifold admin-delivery-section-ph-icon" aria-hidden="true" />
            <div>
              <h2>Áreas de entrega</h2>
              <span>Taxa por distância em km a partir da loja.</span>
            </div>
          </div>
        </div>
        <div className="admin-delivery-areas-body">
          <DeliveryZonesCrud empresaId={empresa?.id} />
        </div>
      </div>

      <RecalcularCoordenadasModal
        open={geocodeModalOpen}
        onClose={() => setGeocodeModalOpen(false)}
        addressLines={addressLines}
        geocoding={geocoding}
        onRecalcular={() => void recalcularCoordenadas()}
      />
    </div>
  );
}
