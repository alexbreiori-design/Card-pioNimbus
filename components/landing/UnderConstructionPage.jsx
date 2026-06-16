'use client';

import Image from 'next/image';
import Link from 'next/link';
import LandingAmbient from '@/components/landing/LandingAmbient';
import LandingIcon from '@/components/landing/LandingIcons';
import { whatsappUrl } from '@/lib/landing/constants';
import '@/styles/landing.css';

export default function UnderConstructionPage() {
  return (
    <div className="landing-page landing-under-construction">
      <LandingAmbient />
      <main className="landing-under-construction__main">
        <div className="landing-under-construction__card">
          <Image
            src="/images/logo-horizontal.png"
            alt="Nimbus"
            width={180}
            height={48}
            className="landing-under-construction__logo"
            priority
          />
          <p className="landing-under-construction__eyebrow">Em construção</p>
          <h1 className="landing-under-construction__title">
            Estamos preparando o cardápio digital mais simples para o seu delivery.
          </h1>
          <p className="landing-under-construction__text">
            Em breve você conhece tudo o que a Nimbus pode fazer pela sua loja. Enquanto isso, se
            você já é lojista, acesse o painel ou fale com a gente.
          </p>
          <div className="landing-under-construction__actions">
            <Link href="/login" className="landing-under-construction__btn landing-under-construction__btn--primary">
              <LandingIcon name="login" className="landing-under-construction__btn-icon" />
              Login do lojista
            </Link>
            <a
              href={whatsappUrl()}
              className="landing-under-construction__btn landing-under-construction__btn--ghost"
              target="_blank"
              rel="noopener noreferrer"
            >
              <LandingIcon name="whatsapp" className="landing-under-construction__btn-icon" />
              Contato
            </a>
          </div>
        </div>
      </main>
      <footer className="landing-under-construction__footer">
        <span>© {new Date().getFullYear()} Nimbus</span>
        <Link href="/login?next=/home" className="landing-under-construction__preview-link">
          ·
        </Link>
      </footer>
    </div>
  );
}
