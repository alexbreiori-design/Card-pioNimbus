'use client';

import MarmitaManager from '@/components/admin/marmita/MarmitaManager';
import { AdminCatalogSkeleton, useAdminMountSkeleton } from '@/components/admin/AdminSkeleton';
import { useAdminData } from '@/hooks/useAdminData';
import { isMarmitaSegment } from '@/lib/empresaSegmentos';

export default function MarmitasPage() {
  const { data, ready } = useAdminData();
  const showSkeleton = useAdminMountSkeleton(ready);
  const enabled = isMarmitaSegment(data.loja?.segmento);

  if (showSkeleton) {
    return <AdminCatalogSkeleton />;
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
