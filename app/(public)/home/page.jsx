import Image from 'next/image';
import Link from 'next/link';
import { getSiteOrigin } from '@/lib/siteUrl';
import styles from './home.module.css';

export const metadata = {
  title: 'Cardápio Nimbus — Cardápio digital para restaurantes',
  description:
    'Cardápio digital, pedidos online e painel para lojistas. Domínio oficial: cardapionimbus.com.br',
  openGraph: {
    title: 'Cardápio Nimbus',
    description: 'Cardápio digital para restaurantes e delivery.',
    url: `${getSiteOrigin()}/home`,
    type: 'website',
    locale: 'pt_BR',
  },
};

export default function HomeMarketingPage() {
  const siteOrigin = getSiteOrigin();

  return (
    <main className={styles.page}>
      <Image
        className={styles.backgroundMascot}
        src="/images/mascote.png"
        alt=""
        width={900}
        height={875}
        priority
        aria-hidden="true"
      />

      <section className={styles.card} aria-label="Cardápio Nimbus">
        <Image
          className={styles.logo}
          src="/images/logo.png"
          alt="Cardápio Nimbus"
          width={150}
          height={126}
          priority
        />

        <p className={styles.kicker}>Cardápio digital</p>
        <h1 className={styles.title}>Seu restaurante com pedidos online, sem complicação</h1>
        <p className={styles.lead}>
          Esta página será a vitrine comercial do Nimbus — planos, benefícios e contato. Enquanto
          isso, lojistas já operam pelo painel e clientes pedem pelo cardápio público de cada loja.
        </p>

        <div className={styles.actions}>
          <Link className={styles.primaryBtn} href="/login">
            Entrar no painel
          </Link>
          <a className={styles.ghostBtn} href={siteOrigin} target="_blank" rel="noopener noreferrer">
            {new URL(siteOrigin).host}
          </a>
        </div>
      </section>

      <footer className={styles.footer}>
        <nav className={styles.legalLinks} aria-label="Informações legais">
          <a href="/privacidade">Privacidade</a>
          <span aria-hidden="true">·</span>
          <a href="/termos">Termos</a>
          <span aria-hidden="true">·</span>
          <a href="/login">Login lojista</a>
        </nav>
      </footer>
    </main>
  );
}
