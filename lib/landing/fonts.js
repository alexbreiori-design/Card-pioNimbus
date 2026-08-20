import { Roboto, Roboto_Condensed } from 'next/font/google';

export const landingRoboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-landing-roboto',
  display: 'swap',
});

export const landingRobotoCondensed = Roboto_Condensed({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-landing-condensed',
  display: 'swap',
});

export const landingFontVariables = `${landingRoboto.variable} ${landingRobotoCondensed.variable}`;
