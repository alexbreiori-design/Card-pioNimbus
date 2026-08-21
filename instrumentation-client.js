import * as Sentry from '@sentry/nextjs';

function isPublicMarketingPath() {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname || '/';
  return path === '/' || path.startsWith('/lp/');
}

const onLanding = isPublicMarketingPath();

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment:
    process.env.NEXT_PUBLIC_NIMBUS_APP_ENV ||
    process.env.NODE_ENV ||
    'development',

  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : onLanding ? 0.05 : 0.1,

  // Replay pesa no TBT da landing — desliga no marketing; admin mantém.
  replaysSessionSampleRate: onLanding ? 0 : 0.1,
  replaysOnErrorSampleRate: onLanding ? 0 : 1.0,

  integrations: onLanding ? [] : [Sentry.replayIntegration()],

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

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
