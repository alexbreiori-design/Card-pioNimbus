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
import CardapioSplash from './CardapioSplash';

export default function CardapioApp() {
  const { storeConfig, splashVisible } = useCardapio();

  return (
    <>
      <CardapioSplash visible={splashVisible} />
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
    </>
  );
}
