'use client';

import ProductModal from '@/components/cardapio/ProductModal';
import ProductModalV2 from './ProductModalV2';
import { useCardapioV2Mobile } from './useCardapioV2Mobile';

/** Mobile (< 1100px): modal v1 (bottom sheet). Desktop: modal v2 (galeria lateral). */
export default function CardapioProductModal() {
  const isMobile = useCardapioV2Mobile();
  return isMobile ? <ProductModal /> : <ProductModalV2 />;
}
