'use client';

import NextError from 'next/error';
import { useEffect } from 'react';

export default function GlobalError({ error }) {
  useEffect(() => {
    // Import dinâmico: o SDK não entra no bundle compartilhado da landing.
    import('@sentry/nextjs')
      .then((Sentry) => Sentry.captureException(error))
      .catch(() => undefined);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
