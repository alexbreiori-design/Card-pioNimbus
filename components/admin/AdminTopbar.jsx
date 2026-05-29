'use client';

import { useAdminData } from '@/hooks/useAdminData';

export default function AdminTopbar({ title, actions }) {
  const { data } = useAdminData();
  const loja = data.loja;

  return (
    <header className="admin-topbar">
      <div className="admin-topbar-brand">
        <div className="admin-topbar-logo">
          {loja.logoUrl ? <img src={loja.logoUrl} alt="Logo da loja" /> : 'N'}
        </div>
        <h1 className="admin-page-title">{title}</h1>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <span className={`admin-store-pill ${loja.aberta ? 'open' : 'closed'}`}>
          {loja.aberta ? 'Loja Aberta' : 'Loja Fechada'}
        </span>
        {actions}
      </div>
    </header>
  );
}
