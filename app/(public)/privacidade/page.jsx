import Link from 'next/link';
import styles from '../legal.module.css';

export const metadata = {
  title: 'Política de Privacidade | Nimbus',
  description: 'Como o Cardápio Nimbus trata dados pessoais de clientes e lojistas.',
};

export default function Page() {
  return (
    <main className={styles.page}>
      <article className={styles.shell}>
        <Link className={styles.back} href="/login">
          ← Voltar
        </Link>

        <h1 className={styles.title}>Política de Privacidade</h1>
        <p className={styles.updated}>Última atualização: 31 de maio de 2026</p>

        <section className={styles.section}>
          <h2>1. Quem somos</h2>
          <p>
            O Cardápio Nimbus é operado pela Nimbus Sistemas. Esta política descreve como tratamos
            dados pessoais no cardápio digital das lojas parceiras e no painel administrativo.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Dados que coletamos</h2>
          <ul>
            <li>
              <strong>Clientes do cardápio:</strong> nome, telefone, endereço de entrega (quando
              aplicável), itens do pedido, forma de pagamento escolhida e observações.
            </li>
            <li>
              <strong>Lojistas e operadores:</strong> e-mail de login, nome de perfil e vínculo com
              a loja (empresa).
            </li>
            <li>
              <strong>Dados técnicos:</strong> logs de acesso, IP aproximado e informações de
              navegador para segurança e diagnóstico de incidentes.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>3. Finalidade</h2>
          <p>Usamos os dados para:</p>
          <ul>
            <li>processar e exibir pedidos à loja;</li>
            <li>permitir acompanhamento de pedidos pelo cliente;</li>
            <li>operar o painel administrativo da loja;</li>
            <li>prevenir abuso (rate limit, auditoria de segurança);</li>
            <li>melhorar estabilidade e suporte.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>4. Compartilhamento</h2>
          <p>
            Os dados do pedido ficam disponíveis para a loja contratante. Utilizamos Supabase e
            Vercel como provedores de infraestrutura. Não vendemos dados pessoais.
          </p>
        </section>

        <section className={styles.section}>
          <h2>5. Retenção</h2>
          <p>
            Pedidos e cadastros de clientes permanecem enquanto a loja utilizar o serviço ou conforme
            necessidade operacional e legal. A loja pode solicitar orientação sobre exclusão via suporte
            Nimbus.
          </p>
        </section>

        <section className={styles.section}>
          <h2>6. Seus direitos</h2>
          <p>
            Você pode solicitar correção ou exclusão de dados entrando em contato com a loja onde fez
            o pedido ou com o suporte Nimbus em{' '}
            <a href="https://cardapionimbus.com.br" target="_blank" rel="noopener noreferrer">
              cardapionimbus.com.br
            </a>
            .
          </p>
        </section>

        <section className={styles.section}>
          <h2>7. Contato do controlador</h2>
          <p>
            Para dúvidas sobre esta política: suporte Nimbus em{' '}
            <a href="https://cardapionimbus.com.br" target="_blank" rel="noopener noreferrer">
              cardapionimbus.com.br
            </a>
            .
          </p>
        </section>

        <p className={styles.footer}>
          Ver também os <Link href="/termos">Termos de uso</Link>.
        </p>
      </article>
    </main>
  );
}
