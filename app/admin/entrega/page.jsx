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

export default function EntregaPage() {
  const { data, ready } = useAdminData();
  const { empresa, slug, loading: empresaLoading, error: empresaError } = useEmpresa();
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
      <AdminPageHeader title="Entrega" icon="delivery" />

      <StoreDeliveryDurationCard />

      <div className="admin-card admin-store-block-card">
        <div className="admin-store-section-head admin-delivery-address-head">
          <div className="admin-delivery-section-intro">
            <h2>Endereço da loja</h2>
            <span>Usado como origem das entregas. Edite em Minha loja.</span>
          </div>
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
                  Recalcular coordenadas
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <div className="admin-delivery-address-body">
          <p className="admin-delivery-store-address-line1">{addressLines.line1}</p>
          {addressLines.line2 ? (
            <p className="admin-delivery-store-address-line2">{addressLines.line2}</p>
          ) : null}
        </div>
      </div>

      <div className="admin-card admin-store-block-card admin-compact-page-card">
        <div className="admin-store-section-head">
          <div className="admin-delivery-section-intro">
            <h2>Áreas de entrega</h2>
            <span>Taxa por distância em km a partir da loja.</span>
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
