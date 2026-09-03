'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import OrderTicket from '@/components/admin/orders/OrderTicket';
import CaixaCloseTicket from '@/components/admin/caixa/CaixaCloseTicket';
import ClienteContaExtratoTicket from '@/components/admin/clientes/ClienteContaExtratoTicket';
import { useAdminData } from '@/hooks/useAdminData';
import {
  AUTO_PRINT_NEW_ORDER_EVENT,
  getOrderTicketWidthMm,
  isOrderPrintOnNewEnabled,
} from '@/lib/orderTicketPrefs';

const OrderPrintContext = createContext({
  printOrder: () => {},
  printCaixaSummary: () => {},
  printClienteConta: () => {},
});

export function useOrderPrint() {
  return useContext(OrderPrintContext);
}

const AUTO_PRINT_DEDUPE_MS = 10 * 60 * 1000;
const AUTO_PRINT_DEDUPE_STORAGE_KEY = 'nimbus_auto_print_order_ids';

function orderPrintKey(order) {
  if (!order) return '';
  return String(order.dbId || order.rawId || order.id || '').trim();
}

function readAutoPrintDedupeMap() {
  const map = new Map();
  if (typeof window === 'undefined') return map;
  try {
    const raw = window.sessionStorage.getItem(AUTO_PRINT_DEDUPE_STORAGE_KEY);
    if (!raw) return map;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return map;
    const now = Date.now();
    for (const [key, ts] of Object.entries(parsed)) {
      const at = Number(ts);
      if (key && Number.isFinite(at) && now - at < AUTO_PRINT_DEDUPE_MS) {
        map.set(key, at);
      }
    }
  } catch {
    // ignore corrupt session cache
  }
  return map;
}

function writeAutoPrintDedupeMap(map) {
  if (typeof window === 'undefined') return;
  try {
    const payload = {};
    const now = Date.now();
    for (const [key, ts] of map.entries()) {
      if (now - ts < AUTO_PRINT_DEDUPE_MS) payload[key] = ts;
    }
    window.sessionStorage.setItem(AUTO_PRINT_DEDUPE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

function buildJob(entry) {
  return {
    ...entry,
    widthMm: getOrderTicketWidthMm(),
  };
}

export function OrderPrintProvider({ children }) {
  const { data } = useAdminData();
  const [printJob, setPrintJob] = useState(null);
  const [portalReady] = useState(() => typeof document !== 'undefined');
  const queueRef = useRef([]);
  const printJobRef = useRef(null);
  const autoPrintedRef = useRef(null);

  if (autoPrintedRef.current == null) {
    autoPrintedRef.current = readAutoPrintDedupeMap();
  }

  useEffect(() => {
    printJobRef.current = printJob;
  }, [printJob]);

  const pumpQueue = useCallback(() => {
    if (printJobRef.current) return;
    const next = queueRef.current.shift();
    if (!next) return;
    setPrintJob(buildJob(next));
  }, []);

  const markAutoPrinted = useCallback((key) => {
    if (!key) return;
    autoPrintedRef.current.set(key, Date.now());
    writeAutoPrintDedupeMap(autoPrintedRef.current);
  }, []);

  const wasRecentlyAutoPrinted = useCallback((key) => {
    if (!key) return false;
    const at = autoPrintedRef.current.get(key);
    if (!at) return false;
    if (Date.now() - at >= AUTO_PRINT_DEDUPE_MS) {
      autoPrintedRef.current.delete(key);
      writeAutoPrintDedupeMap(autoPrintedRef.current);
      return false;
    }
    return true;
  }, []);

  const printOrder = useCallback(
    (order, storeOverride = null, { source = 'user' } = {}) => {
      if (!order) return;
      const key = orderPrintKey(order);
      if (source === 'auto') {
        if (wasRecentlyAutoPrinted(key)) return;
        markAutoPrinted(key);
      }
      queueRef.current.push({ kind: 'order', order, storeOverride });
      pumpQueue();
    },
    [markAutoPrinted, pumpQueue, wasRecentlyAutoPrinted]
  );

  const printCaixaSummary = useCallback(
    ({ summary, turno = null, extras = null, storeOverride = null } = {}) => {
      if (!summary) return;
      queueRef.current.push({ kind: 'caixa', summary, turno, extras, storeOverride });
      pumpQueue();
    },
    [pumpQueue]
  );

  const printClienteConta = useCallback(
    ({ customer, movimentos = [], saldo = 0, storeOverride = null } = {}) => {
      if (!customer) return;
      queueRef.current.push({ kind: 'cliente_conta', customer, movimentos, saldo, storeOverride });
      pumpQueue();
    },
    [pumpQueue]
  );

  useEffect(() => {
    if (printJob) return;
    pumpQueue();
  }, [printJob, pumpQueue]);

  useEffect(() => {
    const onAutoPrint = (event) => {
      if (!isOrderPrintOnNewEnabled()) return;
      const order = event?.detail?.order;
      if (order) printOrder(order, null, { source: 'auto' });
    };
    window.addEventListener(AUTO_PRINT_NEW_ORDER_EVENT, onAutoPrint);
    return () => window.removeEventListener(AUTO_PRINT_NEW_ORDER_EVENT, onAutoPrint);
  }, [printOrder]);

  useEffect(() => {
    if (!printJob) return;

    const widthClass = printJob.widthMm === 58 ? 'order-ticket-printing--58' : 'order-ticket-printing--80';
    document.body.classList.add('order-ticket-printing', widthClass);

    let cancelled = false;
    let fallbackTimer = null;

    const clear = () => {
      if (cancelled) return;
      cancelled = true;
      document.body.classList.remove('order-ticket-printing', 'order-ticket-printing--58', 'order-ticket-printing--80');
      setPrintJob(null);
    };

    const onAfterPrint = () => {
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      clear();
    };

    window.addEventListener('afterprint', onAfterPrint);

    const timer = window.setTimeout(() => {
      if (cancelled) return;
      window.print();
      fallbackTimer = window.setTimeout(clear, 10000);
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      window.removeEventListener('afterprint', onAfterPrint);
      document.body.classList.remove('order-ticket-printing', 'order-ticket-printing--58', 'order-ticket-printing--80');
    };
  }, [printJob]);

  const store = printJob?.storeOverride || data.loja;

  let ticketPortal = null;
  if (portalReady && printJob?.kind === 'order') {
    ticketPortal = createPortal(
      <OrderTicket order={printJob.order} store={store} widthMm={printJob.widthMm} />,
      document.body
    );
  } else if (portalReady && printJob?.kind === 'caixa') {
    ticketPortal = createPortal(
      <CaixaCloseTicket
        store={store}
        turno={printJob.turno}
        summary={printJob.summary}
        extras={printJob.extras}
        widthMm={printJob.widthMm}
      />,
      document.body
    );
  } else if (portalReady && printJob?.kind === 'cliente_conta') {
    ticketPortal = createPortal(
      <ClienteContaExtratoTicket
        store={store}
        customer={printJob.customer}
        movimentos={printJob.movimentos}
        saldo={printJob.saldo}
        widthMm={printJob.widthMm}
      />,
      document.body
    );
  }

  return (
    <OrderPrintContext.Provider value={{ printOrder, printCaixaSummary, printClienteConta }}>
      {children}
      {ticketPortal}
    </OrderPrintContext.Provider>
  );
}
