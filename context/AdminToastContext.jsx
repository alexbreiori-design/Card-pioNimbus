'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import AdminToaster from '@/components/admin/AdminToaster';

const AdminToastContext = createContext(null);

const TOAST_DURATION_MS = {
  default: 2500,
  error: 3000,
  warning: 2750,
  long: 4000,
};

export { TOAST_DURATION_MS };

let toastCounter = 0;

export function AdminToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    ({ title = '', description = '', variant = 'success', duration = TOAST_DURATION_MS.default } = {}) => {
      const id = ++toastCounter;
      const message = String(description || title || '').trim();
      if (!message && !title) return null;

      const nextToast = {
        id,
        title: title || (variant === 'error' ? 'Erro' : variant === 'warning' ? 'Atenção' : 'Sucesso'),
        description: description || (title && !description ? '' : message),
        variant,
        duration,
      };

      setToasts((prev) => [...prev, nextToast]);

      if (duration > 0) {
        const timer = window.setTimeout(() => dismiss(id), duration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [dismiss]
  );

  const toastApi = useMemo(
    () => ({
      toast: pushToast,
      dismiss,
      success: (description, options = {}) =>
        pushToast({ description, variant: 'success', ...options }),
      error: (description, options = {}) =>
        pushToast({ description, variant: 'error', duration: TOAST_DURATION_MS.error, ...options }),
      warning: (description, options = {}) =>
        pushToast({ description, variant: 'warning', duration: TOAST_DURATION_MS.warning, ...options }),
      info: (description, options = {}) =>
        pushToast({ description, variant: 'info', ...options }),
    }),
    [dismiss, pushToast]
  );

  return (
    <AdminToastContext.Provider value={toastApi}>
      {children}
      <AdminToaster toasts={toasts} onDismiss={dismiss} />
    </AdminToastContext.Provider>
  );
}

export function useAdminToast() {
  const context = useContext(AdminToastContext);
  if (!context) {
    throw new Error('useAdminToast must be used within AdminToastProvider');
  }
  return context;
}
