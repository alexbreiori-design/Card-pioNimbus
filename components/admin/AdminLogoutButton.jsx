'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AdminLogoutButton({ variant = 'default' }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const className =
    variant === 'minimal' ? 'admin-logout-icon-btn is-minimal' : 'admin-logout-icon-btn';

  return (
    <button type="button" className={className} onClick={handleLogout} title="Sair">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
      </svg>
    </button>
  );
}
