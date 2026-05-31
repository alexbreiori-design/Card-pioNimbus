'use client';

export { AdminDataProvider, useAdminDataContext } from '@/context/AdminDataContext';
import { useAdminDataContext } from '@/context/AdminDataContext';

export function useAdminData() {
  return useAdminDataContext();
}
