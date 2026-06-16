'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminMobileAccess } from '@/hooks/useAdminMobileAccess';

export default function AdminIndexPage() {
  const router = useRouter();
  const isMobile = useAdminMobileAccess();

  useEffect(() => {
    router.replace(isMobile ? '/admin/relatorios' : '/admin/pedidos');
  }, [isMobile, router]);

  return null;
}
