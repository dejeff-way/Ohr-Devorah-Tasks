import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const admin = createAdminClient();

  // Get all auth users
  const { data: authUsers, error: authError } = await admin.auth.admin.listUsers();

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  const results: { email: string; name: string; role: string; status: string }[] = [];

  for (const user of authUsers.users) {
    const name = user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'Unknown';
    const role = user.user_metadata?.role ?? 'staff';

    const { error: insertError } = await admin
      .from('users')
      .upsert({ id: user.id, email: user.email, name, role }, { onConflict: 'id' });

    results.push({
      email: user.email ?? 'unknown',
      name,
      role,
      status: insertError ? `error: ${insertError.message}` : 'ok',
    });
  }

  return NextResponse.json({ count: results.length, results });
}
