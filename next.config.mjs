import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : '';

const nextConfig = {
  reactCompiler: true,
  experimental: {
    optimizePackageImports: ['motion', 'lottie-react'],
  },
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: 'https',
            hostname: supabaseHost,
            pathname: '/storage/v1/object/public/**',
          },
        ]
      : [],
  },
};

export default withSentryConfig(nextConfig, {
  org: 'nimbus-y4',
  project: 'cardapio-nimbus',

  // Token de build para upload de source maps (Vercel / CI)
  authToken: process.env.SENTRY_AUTH_TOKEN,

  widenClientFileUpload: true,

  // Contorna bloqueadores de anúncio no browser
  tunnelRoute: '/monitoring',

  silent: !process.env.CI,
});
