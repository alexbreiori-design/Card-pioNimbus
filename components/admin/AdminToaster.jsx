'use client';

export default function AdminToaster({ toasts = [], onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div className="admin-toast-viewport" aria-live="polite" aria-relevant="additions text">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`admin-toast admin-toast-${toast.variant}`}
          role="status"
          style={{ '--admin-toast-duration': `${toast.duration}ms` }}
        >
          <div className="admin-toast-content">
            {toast.title ? <strong className="admin-toast-title">{toast.title}</strong> : null}
            {toast.description ? <p className="admin-toast-description">{toast.description}</p> : null}
          </div>
          <button
            type="button"
            className="admin-toast-close"
            aria-label="Fechar notificação"
            onClick={() => onDismiss(toast.id)}
          >
            ×
          </button>
          {toast.duration > 0 ? <span className="admin-toast-progress" aria-hidden="true" /> : null}
        </div>
      ))}
    </div>
  );
}
