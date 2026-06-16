'use client';

import Link from 'next/link';

export default function AdminDesktopOnlyNotice() {
  return (
    <div className="admin-desktop-only-notice">
      <div className="admin-desktop-only-notice-card">
        <div className="admin-desktop-only-notice-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8" />
            <path d="M12 17v4" />
          </svg>
        </div>
        <h1>Disponível no computador</h1>
        <p>
          Esta função não está disponível na versão mobile do painel. Para gerenciar pedidos,
          produtos, cupons e demais configurações, acesse o sistema pelo computador.
        </p>
        <div className="admin-desktop-only-notice-actions">
          <Link href="/admin/relatorios" className="admin-btn admin-btn-primary">
            Ver relatórios
          </Link>
          <Link href="/admin/loja" className="admin-btn admin-btn-ghost">
            Minha loja
          </Link>
        </div>
      </div>
    </div>
  );
}
