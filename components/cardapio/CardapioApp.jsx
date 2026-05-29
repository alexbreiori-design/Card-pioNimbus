'use client';

import { useCardapio } from '@/context/CardapioContext';
import MetaPixel from './MetaPixel';
import TopNav from './TopNav';
import MainPage from './MainPage';
import ProfilePage from './ProfilePage';
import OrdersPage from './OrdersPage';
import MobileSacolaBar from './MobileSacolaBar';
import MobileBottomNav from './MobileBottomNav';
import ProductModal from './ProductModal';
import CheckoutModal from './CheckoutModal';
import CepModal from './CepModal';
import AddressModal from './AddressModal';
import CupomModal from './CupomModal';

export default function CardapioApp() {
  const { storeConfig } = useCardapio();

  return (
    <div className="cardapio-theme-root">
      <MetaPixel pixelId={storeConfig?.metaPixelId} />
      <TopNav />
      <MainPage />
      <OrdersPage />
      <ProfilePage />
      <MobileSacolaBar />
      <MobileBottomNav />
      <ProductModal />
      <CheckoutModal />
      <CepModal />
      <AddressModal />
      <CupomModal />
    </div>
  );
}
