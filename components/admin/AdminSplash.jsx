'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

const FADE_MS = 320;

export default function AdminSplash({ show }) {
  const [mounted, setMounted] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (show) return undefined;
    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), FADE_MS);
    return () => window.clearTimeout(timer);
  }, [show]);

  if (!mounted) return null;

  return (
    <div className={`admin-splash ${visible ? 'admin-splash-visible' : ''}`} aria-hidden="true">
      <Image
        className="admin-splash-icon"
        src="/images/icon.png"
        alt=""
        width={72}
        height={72}
        priority
      />
    </div>
  );
}
