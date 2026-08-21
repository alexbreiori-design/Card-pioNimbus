import { Roboto, Roboto_Condensed } from 'next/font/google';

/** Mesmas famílias da landing original — self-hosted via next/font (sem @import bloqueante). */
export const landingRoboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-landing-roboto',
  display: 'swap',
});

/**
 * Condensada só aparece em títulos abaixo da primeira dobra — sem preload para
 * não disputar banda com a imagem do hero (elemento LCP).
 */
export const landingRobotoCondensed = Roboto_Condensed({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-landing-condensed',
  display: 'swap',
  preload: false,
});

export const landingFontVariables = `${landingRoboto.variable} ${landingRobotoCondensed.variable}`;
