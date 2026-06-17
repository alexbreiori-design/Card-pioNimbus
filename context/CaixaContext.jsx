'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAdminData } from '@/hooks/useAdminData';

const CaixaContext = createContext(null);

const EMPTY_STATE = {
  loading: true,
  isOpen: false,
  turno: null,
  summary: null,
  pendingCount: 0,
  canReopen: false,
  lastClosedTurno: null,
  nextTurnoNumber: 1,
  error: '',
};

async function readJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || 'Erro na operação de caixa.');
  }
  return data;
}

export function CaixaProvider({ children }) {
  const { activeSlug, ready: adminReady } = useAdminData();
  const [state, setState] = useState(EMPTY_STATE);
  const [busy, setBusy] = useState(false);
  const slugRef = useRef(activeSlug);

  useEffect(() => {
    slugRef.current = activeSlug;
  }, [activeSlug]);

  const refresh = useCallback(async ({ silent = false } = {}) => {
    const slug = slugRef.current;
    if (!slug) {
      setState((prev) => ({ ...EMPTY_STATE, loading: false }));
      return null;
    }

    if (!silent) {
      setState((prev) => ({ ...prev, loading: true, error: '' }));
    }

    try {
      const response = await fetch(`/api/admin/caixa?slug=${encodeURIComponent(slug)}`, {
        cache: 'no-store',
      });
      const data = await readJson(response);
      setState({
        loading: false,
        isOpen: Boolean(data.isOpen),
        turno: data.turno || null,
        summary: data.summary || null,
        pendingCount: Number(data.pendingCount || 0),
        canReopen: Boolean(data.canReopen),
        lastClosedTurno: data.lastClosedTurno || null,
        nextTurnoNumber: Number(data.nextTurnoNumber || 1),
        error: '',
      });
      return data;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error?.message || 'Erro ao carregar caixa.',
      }));
      return null;
    }
  }, []);

  useEffect(() => {
    if (!adminReady || !activeSlug) return undefined;
    void refresh();
    const timer = window.setInterval(() => {
      void refresh({ silent: true });
    }, 60000);
    return () => window.clearInterval(timer);
  }, [adminReady, activeSlug, refresh]);

  const openTurno = useCallback(
    async (valorAbertura) => {
      const slug = slugRef.current;
      if (!slug) throw new Error('Loja não identificada.');
      setBusy(true);
      try {
        const response = await fetch('/api/admin/caixa/abrir', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, valorAbertura }),
        });
        const data = await readJson(response);
        setState((prev) => ({
          ...prev,
          loading: false,
          isOpen: true,
          turno: data.turno,
          summary: data.summary,
          pendingCount: Number(data.pendingCount || 0),
          canReopen: false,
          error: '',
        }));
        return data;
      } catch (error) {
        if (String(error?.message || '').includes('Já existe')) {
          await refresh({ silent: true });
        }
        throw error;
      } finally {
        setBusy(false);
      }
    },
    [refresh]
  );

  const closeTurno = useCallback(async ({ turnoId, valorContado, observacao }) => {
    const slug = slugRef.current;
    if (!slug) throw new Error('Loja não identificada.');
    setBusy(true);
    try {
      const response = await fetch('/api/admin/caixa/fechar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, turnoId, valorContado, observacao }),
      });
      const data = await readJson(response);
      setState((prev) => ({
        ...prev,
        loading: false,
        isOpen: false,
        turno: null,
        summary: null,
        canReopen: true,
        lastClosedTurno: data.turno,
        error: '',
      }));
      await refresh({ silent: true });
      return data;
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const reopenTurno = useCallback(async ({ turnoId, justificativa, valorGaveta }) => {
    const slug = slugRef.current;
    if (!slug) throw new Error('Loja não identificada.');
    setBusy(true);
    try {
      const response = await fetch('/api/admin/caixa/reabrir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, turnoId, justificativa, valorGaveta }),
      });
      const data = await readJson(response);
      setState((prev) => ({
        ...prev,
        loading: false,
        isOpen: true,
        turno: data.turno,
        summary: data.summary,
        canReopen: false,
        lastClosedTurno: null,
        error: '',
      }));
      return data;
    } finally {
      setBusy(false);
    }
  }, []);

  const addMovimento = useCallback(async ({ turnoId, tipo, valor, descricao }) => {
    const slug = slugRef.current;
    if (!slug) throw new Error('Loja não identificada.');
    setBusy(true);
    try {
      const response = await fetch('/api/admin/caixa/movimento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, turnoId, tipo, valor, descricao }),
      });
      const data = await readJson(response);
      setState((prev) => ({
        ...prev,
        summary: data.summary || prev.summary,
      }));
      return data;
    } finally {
      setBusy(false);
    }
  }, []);

  const assertOpen = useCallback(() => {
    if (!state.isOpen || !state.turno?.id) {
      throw new Error('Abra o turno de caixa para continuar.');
    }
    return state.turno;
  }, [state.isOpen, state.turno]);

  const value = useMemo(
    () => ({
      ...state,
      busy,
      refresh,
      openTurno,
      closeTurno,
      reopenTurno,
      addMovimento,
      assertOpen,
    }),
    [state, busy, refresh, openTurno, closeTurno, reopenTurno, addMovimento, assertOpen]
  );

  return <CaixaContext.Provider value={value}>{children}</CaixaContext.Provider>;
}

export function useCaixaContext() {
  const ctx = useContext(CaixaContext);
  if (!ctx) {
    throw new Error('useCaixaContext deve ser usado dentro de CaixaProvider.');
  }
  return ctx;
}
