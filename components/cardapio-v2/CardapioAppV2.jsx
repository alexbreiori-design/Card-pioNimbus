'use client';

import EnvironmentBanner from '@/components/shared/EnvironmentBanner';
import CheckoutModal from '@/components/cardapio/CheckoutModal';
import CupomModal from '@/components/cardapio/CupomModal';
import CepModal from '@/components/cardapio/CepModal';
import AddressModal from '@/components/cardapio/AddressModal';
import DeliveryCheckNumberModal from '@/components/cardapio/DeliveryCheckNumberModal';
import DeliveryCheckResultModal from '@/components/cardapio/DeliveryCheckResultModal';
import StoreClosedNotice from '@/components/cardapio/StoreClosedNotice';
import CartReviewModal from '@/components/cardapio/CartReviewModal';
import CardapioDesktopLayout from './CardapioDesktopLayout';
import CardapioMobileLayout from './CardapioMobileLayout';
import CardapioProductModal from './CardapioProductModal';
import '@/styles/cardapio.css';
import '@phosphor-icons/web/regular/style.css';
import '@phosphor-icons/web/bold/style.css';
import '@phosphor-icons/web/fill/style.css';
import '@phosphor-icons/web/duotone/style.css';
import '@/styles/cardapio-v2.css';

export default function CardapioAppV2() {
  return (
    <div className="cardapio-v2-root cardapio-theme-root cardapio-legacy-nav-hidden">
      <EnvironmentBanner className="nimbus-env-banner-cardapio" />

      <CardapioDesktopLayout />
      <CardapioMobileLayout />

      <CardapioProductModal />
      <CartReviewModal />
      <CheckoutModal />
      <CupomModal />
      <CepModal />
      <AddressModal />
      <DeliveryCheckNumberModal />
      <DeliveryCheckResultModal />
      <StoreClosedNotice />
    </div>
  );
}
