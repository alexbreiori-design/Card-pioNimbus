'use client';

import CuponsCrud from '@/components/admin/CuponsCrud';

export default function CuponsPage() {
  return (
    <div className="admin-content admin-content-pedidos admin-store-page">
      <div className="admin-store-actions-row">
        <div className="admin-page-title">Cupons</div>
      </div>
      <div className="admin-card admin-store-block-card">
        <div className="admin-store-fields-center">
          <CuponsCrud />
        </div>
      </div>
    </div>
  );
}
