import styles from './StoreUnavailable.module.css';

export default function StoreUnavailable({ nome }) {
  const title = nome ? `${nome} está indisponível` : 'Loja indisponível';

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1>{title}</h1>
        <p>
          Este cardápio não está ativo no momento. Se você é cliente, tente novamente mais tarde ou
          entre em contato com a loja por outros canais.
        </p>
      </div>
    </main>
  );
}
