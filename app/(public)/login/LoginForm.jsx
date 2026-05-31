'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import styles from './login.module.css';

function getSafeRedirect(searchParams) {
  const redirect = searchParams.get('redirect');

  if (!redirect || !redirect.startsWith('/admin') || redirect.startsWith('/admin/login')) {
    return '/admin/pedidos';
  }

  return redirect;
}

export default function LoginForm() {
  const searchParams = useSearchParams();
  const redirect = getSafeRedirect(searchParams);
  const configError = searchParams.get('error') === 'config';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(
    configError ? 'Autenticação indisponível. Verifique a configuração do Supabase.' : ''
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setError('Supabase não configurado. Contate o administrador.');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError('E-mail ou senha incorretos. Tente novamente.');
        return;
      }

      // Navegação completa garante que cookies de sessão cheguem ao proxy.
      window.location.assign(redirect);
    } catch (submitError) {
      console.error('Erro no login:', submitError?.message || submitError);
      setError('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="nome@nimbus.com"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="password">Senha</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>

      {error ? <p className={styles.errorMessage}>{error}</p> : null}

      <a className={styles.forgotPassword} href="#">
        Esqueceu a senha?
      </a>

      <button className={styles.submitButton} type="submit" disabled={loading}>
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  );
}
