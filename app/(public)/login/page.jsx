import Image from 'next/image';
import { Suspense } from 'react';
import LoginForm from './LoginForm';
import styles from './login.module.css';

export const metadata = {
  title: 'Login | Nimbus',
};

export default function Page() {
  return (
    <main className={styles.page}>
      <Image
        className={styles.backgroundMascot}
        src="/images/mascote.png"
        alt="Mascote Nimbus decorativo ao fundo"
        width={1116}
        height={1089}
        priority
      />

      <section className={styles.shell} aria-label="Login Nimbus">
        <div className={styles.formCard}>
          <Image
            className={styles.logo}
            src="/images/logo.png"
            alt="Logo Nimbus"
            width={135}
            height={113}
            priority
          />

          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>

        <Image
          className={styles.heroMascot}
          src="/images/mascote.png"
          alt="Mascote Nimbus"
          width={775}
          height={756}
          priority
        />
      </section>

      <footer className={styles.footer}>www.sistemasnimbus.com.br</footer>
    </main>
  );
}
