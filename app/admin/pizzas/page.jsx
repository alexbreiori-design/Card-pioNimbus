'use client';

import PizzaManager from '@/components/admin/pizza/PizzaManager';
import { AdminCatalogSkeleton, useAdminMountSkeleton } from '@/components/admin/AdminSkeleton';
import { useAdminData } from '@/hooks/useAdminData';
import { isPizzariaSegment } from '@/lib/empresaSegmentos';

export default function PizzasPage() {
  const { data, ready } = useAdminData();
  const showSkeleton = useAdminMountSkeleton(ready);
  const enabled = isPizzariaSegment(data.loja?.segmento);

  if (showSkeleton) {
    return <AdminCatalogSkeleton />;
  }

  if (!enabled) {
    return (
      <div className="admin-content admin-catalog-page">
        <div className="admin-card admin-empty-catalog">
          O módulo Pizzas está disponível para lojas com segmento Pizzaria. Ajuste em Minha loja.
        </div>
      </div>
    );
  }

  return <PizzaManager />;
}
