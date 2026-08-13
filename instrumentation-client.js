import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment:
    process.env.NEXT_PUBLIC_NIMBUS_APP_ENV ||
    process.env.NODE_ENV ||
    'development',

  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Session Replay: 10% das sessões; 100% quando há erro
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

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
