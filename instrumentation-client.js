/**
 * Sentry no cliente sem entrar no caminho crítico da landing.
 * Em `/` e `/lp/*` o SDK nem é carregado; ele entra sob demanda quando o
 * visitante navega para outra rota (admin, cardápio, etc.).
 */
function isPublicMarketingPath() {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname || '/';
  return path === '/' || path.startsWith('/lp/');
}

let sentryPromise = null;

function loadSentry() {
  if (!sentryPromise) {
    sentryPromise = import('@sentry/nextjs')
      .then((Sentry) => {
        Sentry.init({
          dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

          environment:
            process.env.NEXT_PUBLIC_NIMBUS_APP_ENV ||
            process.env.NODE_ENV ||
            'development',

          tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

          replaysSessionSampleRate: 0.1,
          replaysOnErrorSampleRate: 1.0,

          integrations: [Sentry.replayIntegration()],

          ignoreErrors: [
            'ResizeObserver loop limit exceeded',
            'ResizeObserver loop completed with undelivered notifications',
            /^Network Error$/i,
            /Loading chunk [\d]+ failed/,
            // Ruído de WebView (Instagram/Facebook in-app browser no Android)
            /Java object is gone/i,
            /Error invoking postMessage/i,
          ],
        });
        return Sentry;
      })
      .catch(() => null);
  }
  return sentryPromise;
}

if (!isPublicMarketingPath()) {
  loadSentry();
}

export function onRouterTransitionStart(...args) {
  loadSentry().then((Sentry) => Sentry?.captureRouterTransitionStart?.(...args));
}
