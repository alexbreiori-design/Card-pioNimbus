'use client';

import { useState } from 'react';
import SuperAdminShell from './SuperAdminShell';
import ConfiguracoesPanel from './ConfiguracoesPanel';
import InicioPanel from './InicioPanel';
import RelatoriosPanel from './RelatoriosPanel';
import StoresPanel from './StoresPanel';

export default function SistemaWorkspace() {
  const [activeView, setActiveView] = useState('inicio');
  const [collapsed, setCollapsed] = useState(false);
  const [selectedStoreSlug, setSelectedStoreSlug] = useState(null);

  function goToLojas() {
    setActiveView('lojas');
  }

  function openStore(slug) {
    setActiveView('lojas');
    setSelectedStoreSlug(slug);
  }

  return (
    <SuperAdminShell
      activeView={activeView}
      onViewChange={setActiveView}
      collapsed={collapsed}
      onToggleCollapse={() => setCollapsed((value) => !value)}
    >
      {activeView === 'inicio' ? (
        <InicioPanel onOpenStore={openStore} onGoToLojas={goToLojas} />
      ) : null}
      {activeView === 'lojas' ? (
        <StoresPanel
          initialSelectedSlug={selectedStoreSlug}
          onSelectedSlugChange={setSelectedStoreSlug}
        />
      ) : null}
      {activeView === 'relatorios' ? <RelatoriosPanel onOpenStore={openStore} /> : null}
      {activeView === 'configuracoes' ? <ConfiguracoesPanel /> : null}
    </SuperAdminShell>
  );
}
