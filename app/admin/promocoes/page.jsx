'use client';

import PromocoesCrud from '@/components/admin/PromocoesCrud';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default function PromocoesPage() {
  return (
    <div className="admin-content admin-content-pedidos admin-catalog-page admin-section-page">
      <AdminPageHeader title="Promoções" icon="promo" />
      <div className="admin-card admin-store-block-card">
        <PromocoesCrud />
      </div>
    </div>
  );
}
