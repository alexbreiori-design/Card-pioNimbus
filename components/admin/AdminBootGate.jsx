'use client';

import { useEffect, useRef, useState } from 'react';
import { useAdminData } from '@/hooks/useAdminData';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useAdminOrders } from '@/hooks/useAdminOrders';
import AdminSplash from './AdminSplash';

const MIN_HOLD_AFTER_READY_MS = 420;
const MAX_BOOT_WAIT_MS = 15000;

export default function AdminBootGate({ children }) {
  const { ready: adminReady } = useAdminData();
  const { loading: empresaLoading } = useEmpresa();
  const { loading: ordersLoading } = useAdminOrders();
  const [showSplash, setShowSplash] = useState(true);
  const [bootTimedOut, setBootTimedOut] = useState(false);
  const readyAtRef = useRef(null);

  const bootReady = adminReady && !empresaLoading && !ordersLoading;

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

    const elapsed = Date.now() - readyAtRef.current;
    const delay = Math.max(0, MIN_HOLD_AFTER_READY_MS - elapsed);
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
