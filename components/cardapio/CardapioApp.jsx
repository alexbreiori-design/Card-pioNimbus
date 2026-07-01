'use client';

import { Suspense } from 'react';
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
import DeliveryCheckNumberModal from './DeliveryCheckNumberModal';
import DeliveryCheckResultModal from './DeliveryCheckResultModal';
import StoreClosedNotice from './StoreClosedNotice';
import CupomModal from './CupomModal';
import CartReviewModal from './CartReviewModal';
import CardapioSplash from './CardapioSplash';
import CardapioLegalFooter from './CardapioLegalFooter';
import { SHOW_LEGACY_NAV } from '@/lib/cardapioFeatures';
import EnvironmentBanner from '@/components/shared/EnvironmentBanner';
import '@phosphor-icons/web/regular/style.css';

export default function CardapioApp() {
  const { storeConfig, splashVisible } = useCardapio();

  return (
    <>
      <CardapioSplash visible={splashVisible} />
      <div
        className={`cardapio-theme-root${SHOW_LEGACY_NAV ? '' : ' cardapio-legacy-nav-hidden'}`}
      >
        <EnvironmentBanner className="nimbus-env-banner-cardapio" />
        <MetaPixel pixelId={storeConfig?.metaPixelId} />
        <TopNav />
        <MainPage />
        <OrdersPage />
        <ProfilePage />
        <MobileSacolaBar />
        <MobileBottomNav />
        <ProductModal />
        <CartReviewModal />
        <CheckoutModal />
        <CepModal />
        <AddressModal />
        <DeliveryCheckNumberModal />
        <DeliveryCheckResultModal />
        <StoreClosedNotice />
        <CupomModal />
        <Suspense fallback={null}>
          <CardapioLegalFooter />
        </Suspense>
      </div>
    </>
  );
}
