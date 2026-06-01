'use client';

import { useAdminData } from '@/hooks/useAdminData';

export default function AdminStoreSwitcher({ collapsed = false }) {
  const { memberships, activeSlug, switchStore, switchingStore } = useAdminData();

  if (!memberships || memberships.length <= 1) return null;

  return (
    <div className={`admin-store-switcher ${collapsed ? 'collapsed' : ''}`}>
      <label className="admin-store-switcher-label" htmlFor="admin-active-store">
        Loja ativa
      </label>
      <select
        id="admin-active-store"
        className="admin-store-switcher-select"
        value={activeSlug}
        disabled={switchingStore}
        onChange={(event) => {
          void switchStore(event.target.value).catch(() => {});
        }}
      >
        {memberships.map((membership) => (
          <option key={membership.empresaId} value={membership.slug}>
            {membership.nome}
          </option>
        ))}
      </select>
    </div>
  );
}
