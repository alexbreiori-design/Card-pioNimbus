'use client';

import { useEffect, useState } from 'react';
import { ADMIN_MOBILE_MAX_WIDTH } from '@/lib/admin/mobileAccess';

export function useAdminMobileAccess() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${ADMIN_MOBILE_MAX_WIDTH}px)`);

    function update() {
      setIsMobile(media.matches);
    }

    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return isMobile;
}
