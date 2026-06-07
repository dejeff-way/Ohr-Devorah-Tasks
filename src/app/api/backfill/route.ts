import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: authUsers, error: authError } = await admin.auth.admin.listUsers();

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  const results: { email: string; name: string; role: string; status: string }[] = [];

  for (const u of authUsers.users) {
    const name = u.user_metadata?.name ?? u.email?.split('@')[0] ?? 'Unknown';
    const role = u.user_metadata?.role ?? 'staff';

    const { error: insertError } = await admin
      .from('users')
      .upsert({ id: u.id, email: u.email, name, role }, { onConflict: 'id' });

    results.push({
      email: u.email ?? 'unknown',
      name,
      role,
      status: insertError ? `error: ${insertError.message}` : 'ok',
    });
  }

  return NextResponse.json({ count: results.length, results });
}
