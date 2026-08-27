/** Destino de createPortal no admin (mantém tipografia/contexto do shell). */
export function getAdminPortalRoot() {
  if (typeof document === 'undefined') return null;
  return document.querySelector('.admin-root') || document.body;
}
