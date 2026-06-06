import Link from 'next/link';
import styles from '../legal.module.css';

export const metadata = {
  title: 'Termos de Uso | Nimbus',
  description: 'Termos de uso do Cardápio Nimbus para lojistas e operadores.',
};

export default function Page() {
  return (
    <main className={styles.page}>
      <article className={styles.shell}>
        <Link className={styles.back} href="/login">
          ← Voltar
        </Link>

        <h1 className={styles.title}>Termos de Uso</h1>
        <p className={styles.updated}>Última atualização: 31 de maio de 2026</p>

        <section className={styles.section}>
          <h2>1. Serviço</h2>
          <p>
            O Cardápio Nimbus oferece cardápio digital, recebimento de pedidos e painel administrativo
            para lojas de alimentação e segmentos afins. O uso implica aceite destes termos.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Conta e acesso</h2>
          <p>
            O lojista é responsável por credenciais de login, usuários vinculados à loja e pelo uso
            adequado do painel. Acesso sem vínculo em <code>empresa_membros</code> é bloqueado.
          </p>
        </section>

        <section className={styles.section}>
          <h2>3. Disponibilidade</h2>
          <p>
            Buscamos alta disponibilidade, mas o serviço pode sofrer manutenção ou indisponibilidade
            temporária. Em incidentes, consulte os canais de suporte e o plano operacional documentado
            internamente.
          </p>
        </section>

        <section className={styles.section}>
          <h2>4. Responsabilidades da loja</h2>
          <ul>
            <li>manter cardápio, preços e disponibilidade atualizados;</li>
            <li>atender pedidos recebidos e comunicar o cliente quando necessário;</li>
            <li>configurar corretamente Pix, entrega e horários;</li>
            <li>cumprir a legislação aplicável (consumidor, dados pessoais, fiscal).</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>5. Responsabilidades da Nimbus</h2>
          <ul>
            <li>manter a plataforma em funcionamento dentro do escopo contratado;</li>
            <li>aplicar medidas razoáveis de segurança (RLS, rate limit, backups conforme plano);</li>
            <li>prestar suporte nos canais acordados.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>6. Limitações</h2>
          <p>
            Pagamentos via Pix são informados ao cliente; a confirmação financeira é responsabilidade da
            loja. A Nimbus não se responsabiliza por conteúdo cadastrado pela loja (produtos, imagens,
            promoções) nem por atrasos na operação local.
          </p>
        </section>

        <section className={styles.section}>
          <h2>7. Suporte</h2>
          <p>
            Dúvidas e solicitações:{' '}
            <a href="https://cardapionimbus.com.br" target="_blank" rel="noopener noreferrer">
              cardapionimbus.com.br
            </a>
            .
          </p>
        </section>

        <p className={styles.footer}>
          Ver também a <Link href="/privacidade">Política de privacidade</Link>.
        </p>
      </article>
    </main>
  );
}
