'use client';

import PromocoesCrud from '@/components/admin/PromocoesCrud';

export default function PromocoesPage() {
  return (
    <div className="admin-content admin-content-pedidos admin-store-page">
      <div className="admin-store-actions-row">
        <div className="admin-page-title">Promoções</div>
      </div>
      <div className="admin-card admin-store-block-card">
        <div className="admin-store-fields-center">
          <PromocoesCrud />
        </div>
      </div>
    </div>
  );
}
