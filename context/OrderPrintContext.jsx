'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import OrderTicket from '@/components/admin/orders/OrderTicket';
import { useAdminData } from '@/hooks/useAdminData';
import { getOrderTicketWidthMm } from '@/lib/orderTicketPrefs';

const OrderPrintContext = createContext({ printOrder: () => {} });

export function useOrderPrint() {
  return useContext(OrderPrintContext);
}

export function OrderPrintProvider({ children }) {
  const { data } = useAdminData();
  const [printJob, setPrintJob] = useState(null);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(typeof document !== 'undefined');
  }, []);

  const printOrder = useCallback((order, storeOverride = null) => {
    if (!order) return;
    setPrintJob({
      order,
      widthMm: getOrderTicketWidthMm(),
      storeOverride,
    });
  }, []);

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

  const ticketPortal =
    portalReady && printJob
      ? createPortal(
          <OrderTicket
            order={printJob.order}
            store={printJob.storeOverride || data.loja}
            widthMm={printJob.widthMm}
          />,
          document.body
        )
      : null;

  return (
    <OrderPrintContext.Provider value={{ printOrder }}>
      {children}
      {ticketPortal}
    </OrderPrintContext.Provider>
  );
}
