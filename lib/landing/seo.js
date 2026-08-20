import { NIMBUS_PRICE, NIMBUS_WHATSAPP, whatsappUrl } from '@/lib/landing/constants';
import { getSiteOrigin } from '@/lib/siteUrl';

const GOOGLE_VERIFICATION_FALLBACK = 'W8rrazbtR7aBr97cYVW7jL0GaufK79FRUy20WsBnFOI';

export const LANDING_META = {
  title: 'Cardápio Nimbus | Cardápio digital completo para delivery',
  description:
    'Cardápio digital com pedidos, entregas, gestão e personalização. Tudo incluso, preço justo e suporte humano. Ativação em até 48h.',
  ogImagePath: '/images/landing/hero/devices-idle.png',
};

export function getGoogleSiteVerification() {
  return String(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || GOOGLE_VERIFICATION_FALLBACK).trim();
}

export function getLandingMetadata({ canonicalPath = '/' } = {}) {
  const origin = getSiteOrigin();
  const canonical = `${origin}${canonicalPath === '/' ? '' : canonicalPath}` || origin;
  const ogImage = `${origin}${LANDING_META.ogImagePath}`;

  return {
    title: LANDING_META.title,
    description: LANDING_META.description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: LANDING_META.title,
      description: LANDING_META.description,
      url: canonical,
      type: 'website',
      locale: 'pt_BR',
      siteName: 'Cardápio Nimbus',
      images: [
        {
          url: ogImage,
          width: 2764,
          height: 1684,
          alt: 'Cardápio Nimbus em celular e notebook',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: LANDING_META.title,
      description: LANDING_META.description,
      images: [ogImage],
    },
  };
}

export function getLandingJsonLd() {
  const origin = getSiteOrigin();

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${origin}/#organization`,
        name: 'Cardápio Nimbus',
        url: origin,
        logo: `${origin}/images/logo-horizontal.png`,
        sameAs: [],
        contactPoint: [
          {
            '@type': 'ContactPoint',
            contactType: 'sales',
            telephone: `+${NIMBUS_WHATSAPP}`,
            availableLanguage: ['Portuguese'],
            url: whatsappUrl(),
          },
        ],
      },
      {
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        url: origin,
        name: 'Cardápio Nimbus',
        publisher: { '@id': `${origin}/#organization` },
        inLanguage: 'pt-BR',
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${origin}/#app`,
        name: 'Cardápio Nimbus',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: origin,
        description: LANDING_META.description,
        offers: {
          '@type': 'Offer',
          price: '149.90',
          priceCurrency: 'BRL',
          availability: 'https://schema.org/InStock',
          url: origin,
          description: `Plano completo a partir de ${NIMBUS_PRICE}/mês`,
        },
        provider: { '@id': `${origin}/#organization` },
      },
    ],
  };
}
