import { Roboto, Roboto_Condensed } from 'next/font/google';

/** Mesmas famílias da landing original — self-hosted via next/font (sem @import bloqueante). */
export const landingRoboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-landing-roboto',
  display: 'swap',
});

export const landingRobotoCondensed = Roboto_Condensed({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-landing-condensed',
  display: 'swap',
});

export const landingFontVariables = `${landingRoboto.variable} ${landingRobotoCondensed.variable}`;
