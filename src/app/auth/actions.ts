'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function logout() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  revalidatePath('/');
}

export async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    return { error: 'ADMIN_EMAIL and ADMIN_PASSWORD must be set' };
  }

  const adminClient = createAdminClient();

  // Check if admin already exists
  const { data: existingUsers } = await adminClient.auth.admin.listUsers();
  const existingAdmin = existingUsers?.users.find(
    (u) => u.email === adminEmail
  );

  if (existingAdmin) {
    return { message: 'Admin already exists', email: adminEmail };
  }

  // Create admin user
  const { data, error } = await adminClient.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { name: 'Admin', role: 'admin' },
  });

  if (error) {
    return { error: error.message };
  }

  return { message: 'Admin created', email: adminEmail, userId: data.user.id };
}

export async function seedStaffUsers() {
  const staffUsers = [
    { email: 'mrs.scheiner@ohrdevora.org', name: 'Mrs. Scheiner', role: 'staff' },
    { email: 'mrs.lover@ohrdevora.org', name: 'Mrs. Lover', role: 'staff' },
    { email: 'mrs.roth@ohrdevora.org', name: 'Mrs. Roth', role: 'staff' },
    { email: 'mrs.mizrahi@ohrdevora.org', name: 'Mrs. Mizrahi', role: 'staff' },
    { email: 'mrs.hauer@ohrdevora.org', name: 'Mrs. Hauer', role: 'staff' },
    { email: 'miss.thaler@ohrdevora.org', name: 'Miss Thaler', role: 'staff' },
    { email: 'mr.lichtenstein@ohrdevora.org', name: 'Mr. Lichtenstein', role: 'staff' },
  ];

  const adminClient = createAdminClient();
  const results: { email: string; status: string }[] = [];

  for (const staff of staffUsers) {
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const exists = existingUsers?.users.find((u) => u.email === staff.email);

    if (exists) {
      results.push({ email: staff.email, status: 'already exists' });
      continue;
    }

    // Default password for staff — in production, send invite emails instead
    const defaultPassword = 'OhrDevora123!';

    const { error } = await adminClient.auth.admin.createUser({
      email: staff.email,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: { name: staff.name, role: staff.role },
    });

    if (error) {
      results.push({ email: staff.email, status: `error: ${error.message}` });
    } else {
      results.push({ email: staff.email, status: 'created' });
    }
  }

  return results;
}
