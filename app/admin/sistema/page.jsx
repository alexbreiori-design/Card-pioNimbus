import { Suspense } from 'react';
import SistemaWorkspace from '@/components/admin/super-admin/SistemaWorkspace';

export const metadata = {
  title: 'Super - Cardápio Nimbus',
  description: 'Super-admin Nimbus — quartel-general',
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="admin-content admin-sistema-page">
          <p className="admin-sistema-muted">Carregando sistema...</p>
        </div>
      }
    >
      <SistemaWorkspace />
    </Suspense>
  );
}
