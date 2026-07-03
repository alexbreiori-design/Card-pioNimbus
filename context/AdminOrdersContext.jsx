'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAdminData } from '@/hooks/useAdminData';
import { useEmpresa } from '@/hooks/useEmpresa';
import {
  archiveConcludedOrders,
  cancelAdminOrder,
  fetchAdminOrders,
  fetchLatestOrdersUpdatedAt,
  insertAdminOrder,
  restoreArchivedOrder,
  updateAdminOrder,
  updateAdminOrderStatus,
} from '@/lib/orders/adminOrdersClient';
import { maxOrdersUpdatedAt } from '@/lib/orders/mapAdminOrder';
import { notifyNewOrder, playNewOrderSound } from '@/lib/adminNewOrderAlert';

const POLL_MS = 10000;

const AdminOrdersContext = createContext(null);

export function AdminOrdersProvider({ children }) {
  const { ready: adminReady, activeSlug } = useAdminData();
  const { empresaId, loading: empresaLoading } = useEmpresa();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const watermarkRef = useRef(null);
  const empresaIdRef = useRef(empresaId);
  const knownNovosRef = useRef(new Set());
  const alertsSeededRef = useRef(false);
  const alertsActiveRef = useRef(false);
  const [alertsActive, setAlertsActive] = useState(false);

  useEffect(() => {
    alertsActiveRef.current = alertsActive;
  }, [alertsActive]);

  useEffect(() => {
    empresaIdRef.current = empresaId;
  }, [empresaId]);

  const refreshOrders = useCallback(
    async ({ force = false, silent = false } = {}) => {
      const eid = empresaIdRef.current;
      if (!eid) {
        setOrders([]);
        setLoading(false);
        return [];
      }

      if (!silent) setRefreshing(true);
      try {
        if (!force) {
          const latest = await fetchLatestOrdersUpdatedAt(eid);
        if (latest && watermarkRef.current === latest) {
          return [];
        }
          watermarkRef.current = latest;
        }

        const next = await fetchAdminOrders(eid);
        watermarkRef.current = maxOrdersUpdatedAt(
          next.map((order) => ({ updated_at: order.updatedAt }))
        );
        setOrders(next);

        const novos = next.filter((order) => order.status === 'novo' && !order.arquivado);
        if (!alertsSeededRef.current) {
          novos.forEach((order) => knownNovosRef.current.add(order.id));
          alertsSeededRef.current = true;
        } else if (alertsActiveRef.current) {
          for (const order of novos) {
            if (knownNovosRef.current.has(order.id)) continue;
            knownNovosRef.current.add(order.id);
            playNewOrderSound();
            notifyNewOrder(order);
          }
        }

        return next;
      } finally {
        setLoading(false);
        if (!silent) setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!adminReady || empresaLoading) return undefined;
    if (!empresaId) {
      setOrders([]);
      setLoading(false);
      return undefined;
    }

    watermarkRef.current = null;
    knownNovosRef.current = new Set();
    alertsSeededRef.current = false;
    setLoading(true);
    void refreshOrders({ force: true });

    const timer = window.setInterval(() => {
      void refreshOrders({ silent: true });
    }, POLL_MS);

    const onFocus = () => void refreshOrders({ silent: true });
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [adminReady, empresaId, empresaLoading, activeSlug, refreshOrders]);

  const patchOrderStatus = useCallback(
    async (order, nextStatus) => {
      if (!empresaId || !order) return;
      await updateAdminOrderStatus({
        empresaId,
        dbId: order.dbId,
        codigo: order.id,
        nextStatus,
      });
      await refreshOrders({ force: true, silent: true });
    },
    [empresaId, refreshOrders]
  );

  const cancelOrder = useCallback(
    async (order) => {
      if (!empresaId || !order) return;
      await cancelAdminOrder({ empresaId, dbId: order.dbId, codigo: order.id });
      await refreshOrders({ force: true, silent: true });
    },
    [empresaId, refreshOrders]
  );

  const archiveConcluded = useCallback(async () => {
    if (!empresaId) return;
    await archiveConcludedOrders(empresaId);
    await refreshOrders({ force: true, silent: true });
  }, [empresaId, refreshOrders]);

  const restoreArchived = useCallback(
    async (order) => {
      if (!empresaId || !order) return;
      await restoreArchivedOrder({ empresaId, dbId: order.dbId, codigo: order.id });
      await refreshOrders({ force: true, silent: true });
    },
    [empresaId, refreshOrders]
  );

  const createOrder = useCallback(
    async (order, items) => {
      if (!empresaId) throw new Error('Empresa não identificada.');
      await insertAdminOrder({ empresaId, order, items });
      await refreshOrders({ force: true, silent: true });
    },
    [empresaId, refreshOrders]
  );

  const updateOrder = useCallback(
    async (order, items) => {
      if (!empresaId) throw new Error('Empresa não identificada.');
      if (!order?.dbId) throw new Error('Pedido não encontrado para edição.');
      await updateAdminOrder({ empresaId, order, items });
      await refreshOrders({ force: true, silent: true });
    },
    [empresaId, refreshOrders]
  );

  const value = useMemo(
    () => ({
      orders,
      loading,
      refreshing,
      refreshOrders,
      patchOrderStatus,
      cancelOrder,
      archiveConcluded,
      restoreArchived,
      createOrder,
      updateOrder,
      alertsActive,
      setAlertsActive,
    }),
    [
      orders,
      loading,
      refreshing,
      refreshOrders,
      patchOrderStatus,
      cancelOrder,
      archiveConcluded,
      restoreArchived,
      createOrder,
      updateOrder,
      alertsActive,
    ]
  );

  return <AdminOrdersContext.Provider value={value}>{children}</AdminOrdersContext.Provider>;
}

export function useAdminOrdersContext() {
  const ctx = useContext(AdminOrdersContext);
  if (!ctx) {
    throw new Error('useAdminOrders deve ser usado dentro de AdminOrdersProvider.');
  }
  return ctx;
}
