'use client';

import { useEffect, useRef, useState } from 'react';
import { useAdminData } from '@/hooks/useAdminData';
import { useEmpresa } from '@/hooks/useEmpresa';
import AdminSplash, { ADMIN_SPLASH_STAGGER_S } from './AdminSplash';

/** Tempo mínimo total para burger → pizza → sorvete aparecerem com calma. */
const MIN_SPLASH_TOTAL_MS = Math.round(ADMIN_SPLASH_STAGGER_S * 3 * 1000) + 400;
/** Pequeno hold após o boot ficar pronto. */
const MIN_HOLD_AFTER_READY_MS = 320;
const MAX_BOOT_WAIT_MS = 15000;

export default function AdminBootGate({ children }) {
  const { ready: adminReady } = useAdminData();
  const { loading: empresaLoading } = useEmpresa();
  const [showSplash, setShowSplash] = useState(true);
  const [bootTimedOut, setBootTimedOut] = useState(false);
  const readyAtRef = useRef(null);
  const startedAtRef = useRef(null);

  // Não espera pedidos: a tela de pedidos mostra skeleton só na 1ª abertura.
  const bootReady = adminReady && !empresaLoading;

  useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setBootTimedOut(true), MAX_BOOT_WAIT_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!bootReady && !bootTimedOut) {
      readyAtRef.current = null;
      return undefined;
    }

    if (!readyAtRef.current) {
      readyAtRef.current = Date.now();
    }

    const now = Date.now();
    const sinceReady = now - readyAtRef.current;
    const sinceStart = now - (startedAtRef.current || now);
    const delay = Math.max(
      0,
      MIN_HOLD_AFTER_READY_MS - sinceReady,
      MIN_SPLASH_TOTAL_MS - sinceStart
    );
    const timer = window.setTimeout(() => setShowSplash(false), delay);
    return () => window.clearTimeout(timer);
  }, [bootReady, bootTimedOut]);

  return (
    <>
      <AdminSplash show={showSplash} />
      <div className={`admin-boot-content ${showSplash ? '' : 'admin-boot-content-visible'}`}>
        {children}
      </div>
    </>
  );
}
