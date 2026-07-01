'use client';

import AdminPageHeader from '@/components/admin/AdminPageHeader';
import ReviewsAdminPanel from '@/components/admin/ReviewsAdminPanel';

export default function AvaliacoesPage() {
  return (
    <div className="admin-content admin-section-page admin-reviews-page">
      <AdminPageHeader title="Avaliações" icon="orders" />
      <ReviewsAdminPanel />
    </div>
  );
}
