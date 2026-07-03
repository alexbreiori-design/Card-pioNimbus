'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { STORE_REVIEWS_UI_ENABLED } from '@/lib/features';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import ReviewsAdminPanel from '@/components/admin/ReviewsAdminPanel';

export default function AvaliacoesPage() {
  const router = useRouter();

  useEffect(() => {
    if (!STORE_REVIEWS_UI_ENABLED) {
      router.replace('/admin/pedidos');
    }
  }, [router]);

  if (!STORE_REVIEWS_UI_ENABLED) {
    return (
      <div className="admin-content admin-section-page admin-reviews-page">
        <AdminPageHeader title="Avaliações" icon="orders" />
        <p className="admin-help-text">Redirecionando…</p>
      </div>
    );
  }

  return (
    <div className="admin-content admin-section-page admin-reviews-page">
      <AdminPageHeader title="Avaliações" icon="orders" />
      <ReviewsAdminPanel />
    </div>
  );
}
