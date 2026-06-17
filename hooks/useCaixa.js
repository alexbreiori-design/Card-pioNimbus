'use client';

export { CaixaProvider, useCaixaContext } from '@/context/CaixaContext';

import { useCaixaContext } from '@/context/CaixaContext';

export function useCaixa() {
  return useCaixaContext();
}
