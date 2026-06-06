'use client';

export default function SuperAdminThemeToggle({ theme = 'light', onChange, collapsed = false }) {
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className="admin-sistema-theme-btn"
      onClick={() => onChange?.(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
      title={isDark ? 'Tema claro' : 'Tema escuro'}
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5z" />
        </svg>
      )}
      {!collapsed ? <span className="admin-nav-label">{isDark ? 'Tema claro' : 'Tema escuro'}</span> : null}
    </button>
  );
}
