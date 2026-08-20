import { getSiteOrigin } from '@/lib/siteUrl';

export default function robots() {
  const origin = getSiteOrigin();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/', '/login', '/api/', '/rota/', '/lp/', '/home'],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
