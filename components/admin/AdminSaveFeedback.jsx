'use client';

import { useEffect, useRef } from 'react';
import { TOAST_DURATION_MS, useAdminToast } from '@/context/AdminToastContext';
import { useAdminData } from '@/hooks/useAdminData';

const PROGRESS_TOAST_MS = 60_000;

/** Toasts globais para salvamento, troca de loja e erros do store state. */
export default function AdminSaveFeedback() {
  const toast = useAdminToast();
  const { saving, saveError, clearSaveError, switchingStore } = useAdminData();
  const savingToastIdRef = useRef(null);
  const switchingToastIdRef = useRef(null);
  const wasSwitchingRef = useRef(false);
  const lastSaveErrorRef = useRef('');

  useEffect(() => {
    if (saving) {
      if (savingToastIdRef.current == null) {
        savingToastIdRef.current = toast.toast({
          title: 'Salvando…',
          description: 'Aguarde a conclusão do salvamento.',
          variant: 'info',
          duration: PROGRESS_TOAST_MS,
        });
      }
      return;
    }

    if (savingToastIdRef.current != null) {
      toast.dismiss(savingToastIdRef.current);
      savingToastIdRef.current = null;
    }
  }, [saving, toast]);

  useEffect(() => {
    if (switchingStore) {
      wasSwitchingRef.current = true;
      if (switchingToastIdRef.current == null) {
        switchingToastIdRef.current = toast.toast({
          title: 'Trocando de loja…',
          description: 'Carregando os dados da loja selecionada.',
          variant: 'info',
          duration: PROGRESS_TOAST_MS,
        });
      }
      return;
    }

    if (switchingToastIdRef.current != null) {
      toast.dismiss(switchingToastIdRef.current);
      switchingToastIdRef.current = null;
    }
    if (wasSwitchingRef.current) {
      wasSwitchingRef.current = false;
      toast.success('Loja alterada.');
    }
  }, [switchingStore, toast]);

  useEffect(() => {
    const message = String(saveError || '').trim();
    if (!message || message === lastSaveErrorRef.current) return;
    lastSaveErrorRef.current = message;
    toast.error(message, { duration: TOAST_DURATION_MS.error });
    clearSaveError();
  }, [saveError, clearSaveError, toast]);

  return null;
}
