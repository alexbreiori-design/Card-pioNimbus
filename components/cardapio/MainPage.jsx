'use client';

import { useCardapio } from '@/context/CardapioContext';
import Cover from './Cover';
import StoreHeader from './StoreHeader';
import FiltersBar from './FiltersBar';
import ProductSections from './ProductSections';
import CartSidebar from './CartSidebar';

export default function MainPage() {
  const { page } = useCardapio();

  if (page !== 'main') return null;

  return (
    <div id="mainPage">
      <Cover />
      <div className="page-wrapper">
        <div className="main-layout">
          <div className="content-col">
            <StoreHeader />
            <FiltersBar />
            <div id="productSections">
              <ProductSections />
            </div>
          </div>
          <CartSidebar />
        </div>
      </div>
    </div>
  );
}
