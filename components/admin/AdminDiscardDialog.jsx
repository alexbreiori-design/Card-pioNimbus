'use client';

export default function AdminDiscardDialog({
  open,
  title = 'Descartar alterações?',
  message = 'As informações preenchidas serão perdidas.',
  confirmLabel = 'Descartar',
  cancelLabel = 'Continuar editando',
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div
      className="admin-confirm-overlay admin-discard-overlay"
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) event.stopPropagation();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel?.();
      }}
    >
      <div
        className="admin-confirm-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-discard-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="admin-discard-title">{title}</h3>
        <p>{message}</p>
        <div className="admin-confirm-actions">
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="admin-btn admin-btn-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
