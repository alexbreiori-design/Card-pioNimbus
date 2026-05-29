'use client';

import { useCardapio } from '@/context/CardapioContext';
import { IconHome, IconOrders, IconProfile, IconPromo } from './icons';

export default function MobileBottomNav() {
  const {
    mobileNavActive,
    showMainPage,
    handlePromoNav,
    showProfile,
    showOrdersPage,
    setMobileNav,
    setNavActive,
  } = useCardapio();

  return (
    <div className="mobile-bottom-nav">
      <div
        className={`nav-item ${mobileNavActive === 'mNavInicio' ? 'active' : ''}`}
        onClick={() => {
          showMainPage();
          setMobileNav('mNavInicio');
          setNavActive('navInicio');
        }}
        role="button"
        tabIndex={0}
      >
        <IconHome />
        Início
      </div>
      <div
        className={`nav-item ${mobileNavActive === 'mNavPromo' ? 'active' : ''}`}
        onClick={() => {
          handlePromoNav();
          setMobileNav('mNavPromo');
        }}
        role="button"
        tabIndex={0}
      >
        <IconPromo />
        Promoções
      </div>
      <div
        className={`nav-item ${mobileNavActive === 'mNavPedidos' ? 'active' : ''}`}
        onClick={() => {
          showOrdersPage();
          setMobileNav('mNavPedidos');
        }}
        role="button"
        tabIndex={0}
      >
        <IconOrders />
        Pedidos
      </div>
      <div
        className={`nav-item ${mobileNavActive === 'mNavPerfil' ? 'active' : ''}`}
        onClick={() => {
          showProfile();
          setMobileNav('mNavPerfil');
        }}
        role="button"
        tabIndex={0}
      >
        <IconProfile />
        Perfil
      </div>
    </div>
  );
}
