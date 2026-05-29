'use client';

import { useCardapio } from '@/context/CardapioContext';
import { IconHome, IconOrders, IconProfile, IconPromo } from './icons';

export default function TopNav() {
  const { navActive, showMainPage, handlePromoNav, showProfile, showOrdersPage, setNavActive } = useCardapio();

  return (
    <nav className="top-nav">
      <div className="top-nav-inner">
        <button
          type="button"
          className={`top-nav-item ${navActive === 'navInicio' ? 'active' : ''}`}
          onClick={() => {
            showMainPage();
            setNavActive('navInicio');
          }}
        >
          <IconHome />
          Início
        </button>
        <button
          type="button"
          className={`top-nav-item ${navActive === 'navPromo' ? 'active' : ''}`}
          onClick={() => {
            handlePromoNav();
            setNavActive('navPromo');
          }}
        >
          <IconPromo />
          Promoções
        </button>
        <button
          type="button"
          className={`top-nav-item ${navActive === 'navPedidos' ? 'active' : ''}`}
          onClick={() => {
            showOrdersPage();
          }}
        >
          <IconOrders />
          Pedidos
        </button>
        <button
          type="button"
          className={`top-nav-item ${navActive === 'navPerfil' ? 'active' : ''}`}
          onClick={showProfile}
        >
          <IconProfile />
          Perfil
        </button>
      </div>
    </nav>
  );
}
