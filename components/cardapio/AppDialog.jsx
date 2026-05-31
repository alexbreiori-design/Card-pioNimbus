'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const AppDialogContext = createContext(null);

export function AppDialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  const closeDialog = useCallback(() => setDialog(null), []);

  const showAlert = useCallback((message, { title = 'Aviso' } = {}) => {
    return new Promise((resolve) => {
      setDialog({
        title,
        message,
        confirmLabel: 'OK',
        onConfirm: () => {
          setDialog(null);
          resolve(true);
        },
      });
    });
  }, []);

  const value = useMemo(() => ({ showAlert, closeDialog }), [showAlert, closeDialog]);

  return (
    <AppDialogContext.Provider value={value}>
      {children}
      {dialog ? (
        <div className="generic-overlay open" role="presentation">
          <div className="modal-card app-dialog-card" role="dialog" aria-modal="true">
            <div className="modal-topbar">
              <div style={{ width: 30 }} />
              <div className="modal-topbar-title">{dialog.title}</div>
              <button type="button" className="modal-close" onClick={dialog.onConfirm} aria-label="Fechar">
                ×
              </button>
            </div>
            <div className="modal-body">
              <p className="app-dialog-message">{dialog.message}</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-modal-confirm" onClick={dialog.onConfirm}>
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppDialogContext.Provider>
  );
}

export function useAppDialog() {
  const ctx = useContext(AppDialogContext);
  if (!ctx) throw new Error('useAppDialog deve ser usado dentro de AppDialogProvider.');
  return ctx;
}
