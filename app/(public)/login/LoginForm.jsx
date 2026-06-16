'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isAdminMobileViewport, resolveAdminMobileRedirect } from '@/lib/admin/mobileAccess';
import styles from './login.module.css';

function getSafeRedirect(searchParams) {
  const next = searchParams.get('next') || searchParams.get('redirect');

  if (next === '/home') {
    return '/home';
  }

  if (next && next.startsWith('/admin') && !next.startsWith('/admin/login')) {
    return next;
  }

  return '/admin/pedidos';
}

export default function LoginForm() {
  const searchParams = useSearchParams();
  const redirect = getSafeRedirect(searchParams);
  const configError = searchParams.get('error') === 'config';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(
    configError ? 'Autenticação indisponível. Verifique a configuração do Supabase.' : ''
  );
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

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

      window.location.assign(
        resolveAdminMobileRedirect(redirect, { isMobile: isAdminMobileViewport() })
      );
    } catch (submitError) {
      console.error('Erro no login:', submitError?.message || submitError);
      const message = String(submitError?.message || submitError || '');
      if (message.includes('Supabase public config ausente')) {
        setError(
          'Supabase não configurado na Vercel. Confira NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no projeto cardapio-nimbus (Production) e faça um novo deploy.'
        );
      } else {
        setError('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(event) {
    event.preventDefault();
    setError('');
    setInfo('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Informe seu e-mail acima para receber o link de redefinição.');
      return;
    }

    setResetLoading(true);
    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (resetError) {
        setError('Não foi possível enviar o e-mail de recuperação. Tente novamente.');
        return;
      }
      setInfo('Enviamos um link para redefinir sua senha. Verifique sua caixa de entrada.');
    } catch (resetSubmitError) {
      console.error('Erro ao recuperar senha:', resetSubmitError?.message || resetSubmitError);
      setError('Não foi possível enviar o e-mail de recuperação.');
    } finally {
      setResetLoading(false);
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
        <div className={styles.passwordWrap}>
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button
            type="button"
            className={styles.passwordToggle}
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showPassword ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
      </div>

      {error ? <p className={styles.errorMessage}>{error}</p> : null}
      {info ? <p className={styles.infoMessage}>{info}</p> : null}

      <button
        type="button"
        className={styles.forgotPassword}
        onClick={handleForgotPassword}
        disabled={resetLoading || loading}
      >
        {resetLoading ? 'Enviando...' : 'Esqueceu a senha?'}
      </button>

      <button className={styles.submitButton} type="submit" disabled={loading || resetLoading}>
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  );
}
