import { getSiteOrigin } from '@/lib/siteUrl';

export default function sitemap() {
  const origin = getSiteOrigin();
  const lastModified = new Date();

  return [
    {
      url: origin,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${origin}/termos`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${origin}/privacidade`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
