'use client';

import { usePathname } from 'next/navigation';
import { isAdminMobileAllowedPath } from '@/lib/admin/mobileAccess';
import { useAdminMobileAccess } from '@/hooks/useAdminMobileAccess';
import AdminDesktopOnlyNotice from '@/components/admin/AdminDesktopOnlyNotice';

export default function AdminMobileGate({ children }) {
  const pathname = usePathname();
  const isMobile = useAdminMobileAccess();

  if (!isMobile || isAdminMobileAllowedPath(pathname)) {
    return children;
  }

  return <AdminDesktopOnlyNotice />;
}
