'use client';

import CuponsCrud from '@/components/admin/CuponsCrud';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default function CuponsPage() {
  return (
    <div className="admin-content admin-content-pedidos admin-catalog-page admin-section-page admin-compact-card-page">
      <AdminPageHeader title="Cupons" icon="coupon" />
      <div className="admin-card admin-store-block-card admin-compact-page-card">
        <CuponsCrud />
      </div>
    </div>
  );
}
