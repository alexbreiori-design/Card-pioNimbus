'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import SuperAdminShell from './SuperAdminShell';
import ComandoPanel from './ComandoPanel';
import ComercialPanel from './ComercialPanel';
import InboxPanel from './InboxPanel';
import NovidadesPanel from './NovidadesPanel';
import RelatoriosPanel from './RelatoriosPanel';
import StoresPanel from './StoresPanel';
import SistemaPanel from './SistemaPanel';

const VALID_VIEWS = new Set([
  'comando',
  'lojas',
  'comercial',
  'novidades',
  'inbox',
  'relatorios',
  'sistema',
]);

const VIEW_ALIASES = {
  inicio: 'comando',
  configuracoes: 'sistema',
};

function normalizeView(raw) {
  const value = String(raw || '').trim();
  if (VIEW_ALIASES[value]) return VIEW_ALIASES[value];
  if (VALID_VIEWS.has(value)) return value;
  return 'comando';
}

export default function SistemaWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeView = normalizeView(searchParams.get('view'));
  const selectedStoreSlug = searchParams.get('loja') || null;
  const selectedStoreTab = searchParams.get('aba') || null;

  const [collapsed, setCollapsed] = useState(false);
  const [inboxBadge, setInboxBadge] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function loadBadge() {
      try {
        const response = await fetch('/api/super-admin/feedback?status=aberto');
        const payload = await response.json().catch(() => ({}));
        if (!cancelled && response.ok && payload.ok) {
          setInboxBadge(Number(payload.abertos || 0));
        }
      } catch {
        // ignore
      }
    }
    loadBadge();
    const interval = window.setInterval(loadBadge, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const writeParams = useCallback(
    (patch) => {
      const next = new URLSearchParams(searchParams.toString());
      Object.entries(patch).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      });
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  function setActiveView(view) {
    const nextView = normalizeView(view);
    writeParams({
      view: nextView === 'comando' ? null : nextView,
      loja: nextView === 'lojas' ? selectedStoreSlug : null,
      aba: nextView === 'lojas' ? selectedStoreTab : null,
    });
  }

  function goToLojas() {
    writeParams({ view: 'lojas', loja: null, aba: null });
  }

  function openStore(slug, aba = null) {
    writeParams({
      view: 'lojas',
      loja: slug || null,
      aba: aba || null,
    });
  }

  function setSelectedStoreSlug(slug) {
    writeParams({
      view: 'lojas',
      loja: slug || null,
      aba: slug ? selectedStoreTab : null,
    });
  }

  function setSelectedStoreTab(aba) {
    writeParams({
      view: 'lojas',
      loja: selectedStoreSlug,
      aba: aba || null,
    });
  }

  useEffect(() => {
    const raw = searchParams.get('view');
    if (!raw) return;
    if (VIEW_ALIASES[raw]) {
      writeParams({ view: VIEW_ALIASES[raw] });
    }
  }, [searchParams, writeParams]);

  const shellView = useMemo(() => activeView, [activeView]);

  return (
    <SuperAdminShell
      activeView={shellView}
      onViewChange={setActiveView}
      collapsed={collapsed}
      onToggleCollapse={() => setCollapsed((value) => !value)}
      inboxBadge={inboxBadge}
    >
      {activeView === 'comando' ? (
        <ComandoPanel onOpenStore={openStore} onGoToLojas={goToLojas} />
      ) : null}
      {activeView === 'lojas' ? (
        <StoresPanel
          initialSelectedSlug={selectedStoreSlug}
          initialTab={selectedStoreTab}
          onSelectedSlugChange={setSelectedStoreSlug}
          onSelectedTabChange={setSelectedStoreTab}
        />
      ) : null}
      {activeView === 'comercial' ? <ComercialPanel onOpenStore={openStore} /> : null}
      {activeView === 'novidades' ? <NovidadesPanel /> : null}
      {activeView === 'inbox' ? <InboxPanel onOpenStore={openStore} /> : null}
      {activeView === 'relatorios' ? <RelatoriosPanel onOpenStore={openStore} /> : null}
      {activeView === 'sistema' ? <SistemaPanel /> : null}
    </SuperAdminShell>
  );
}
