'use client';

import MarmitaManager from '@/components/admin/marmita/MarmitaManager';
import { useAdminData } from '@/hooks/useAdminData';
import { isMarmitaSegment } from '@/lib/empresaSegmentos';

export default function MarmitasPage() {
  const { data, ready } = useAdminData();
  const enabled = isMarmitaSegment(data.loja?.segmento);

  if (!ready) {
    return (
      <div className="admin-content admin-catalog-page">
        <p className="admin-help-text">Carregando...</p>
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="admin-content admin-catalog-page">
        <div className="admin-card admin-empty-catalog">
          O módulo Marmitas está disponível para lojas dos segmentos Restaurante, Marmitaria,
          Churrascaria e cozinhas internacionais/saudáveis. Ajuste o segmento em Minha loja.
        </div>
      </div>
    );
  }

  return <MarmitaManager />;
}
