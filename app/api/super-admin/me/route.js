import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/membership';
import { isSuperAdminEmail } from '@/lib/superAdmin';

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ ok: false, superAdmin: false }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    superAdmin: isSuperAdminEmail(user.email),
    email: user.email,
  });
}
