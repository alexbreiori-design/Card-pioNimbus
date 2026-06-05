'use client';

import { useCallback, useState } from 'react';
import DeliveryZonesCrud from '@/components/admin/DeliveryZonesCrud';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { formatCep } from '@/lib/cep/viacep';
import { useAdminData } from '@/hooks/useAdminData';
import { useEmpresa } from '@/hooks/useEmpresa';

function formatStoreAddressLines(loja) {
  if (!loja) {
    return { line1: '—', line2: '' };
  }

  const line1 = [
    loja.enderecoLogradouro,
    loja.enderecoNumero ? `, ${loja.enderecoNumero}` : '',
    loja.enderecoBairro ? ` — ${loja.enderecoBairro}` : '',
  ]
    .join('')
    .trim();

  const cityState = [loja.enderecoCidade, loja.enderecoEstado ? `/${loja.enderecoEstado}` : '']
    .filter(Boolean)
    .join('');

  const cep = loja.enderecoCep ? `CEP ${formatCep(loja.enderecoCep)}` : '';
  const line2 = [cityState, cep].filter(Boolean).join(' · ');

  return {
    line1: line1 || loja.endereco || 'Endereço não informado.',
    line2,
  };
}

export default function EntregaPage() {
  const { data, ready } = useAdminData();
  const { empresa, slug, loading: empresaLoading, error: empresaError } = useEmpresa();
  const loja = data?.loja;
  const [msg, setMsg] = useState('');
  const [geocoding, setGeocoding] = useState(false);

  const addressLines = formatStoreAddressLines(loja);

  const recalcularCoordenadas = useCallback(async () => {
    if (!slug || !loja) return;
    setGeocoding(true);
    setMsg('');
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
      setMsg('Coordenadas da loja atualizadas com sucesso.');
    } catch (e) {
      setMsg(e?.message || 'Não foi possível recalcular as coordenadas.');
    } finally {
      setGeocoding(false);
      setTimeout(() => setMsg(''), 3200);
    }
  }, [slug, loja]);

  if (!ready) return null;

  return (
    <div className="admin-content admin-content-pedidos admin-catalog-page admin-section-page admin-delivery-page admin-compact-card-page">
      {empresaError ? (
        <div className="admin-card admin-store-message" style={{ color: 'var(--admin-red)' }}>
          {empresaError}
        </div>
      ) : null}
      {msg ? <div className="admin-card admin-store-message">{msg}</div> : null}

      <AdminPageHeader title="Entrega" icon="delivery" />

      <div className="admin-card admin-store-block-card">
        <div className="admin-store-section-head admin-delivery-address-head">
          <div className="admin-delivery-section-intro">
            <h2>Endereço da loja</h2>
            <span>Usado como origem das entregas. Edite em Minha loja.</span>
          </div>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={recalcularCoordenadas}
            disabled={geocoding || empresaLoading || !slug}
          >
            {geocoding ? 'Recalculando…' : 'Recalcular coordenadas'}
          </button>
        </div>
        <div className="admin-delivery-address-body">
          <p className="admin-delivery-store-address-line1">{addressLines.line1}</p>
          {addressLines.line2 ? (
            <p className="admin-delivery-store-address-line2">{addressLines.line2}</p>
          ) : null}
          <p className="admin-help-text admin-delivery-address-hint">
            As coordenadas são salvas automaticamente ao salvar o endereço em Minha loja. O botão acima força uma nova consulta.
          </p>
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
    </div>
  );
}
