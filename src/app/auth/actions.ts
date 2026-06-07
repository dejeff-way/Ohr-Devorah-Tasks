'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  // Check if user has picked a name yet
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('name')
      .eq('id', user.id)
      .single();

    // New user without a name → redirect to pick one
    if (!profile || !profile.name || profile.name === 'Unknown') {
      revalidatePath('/auth/pick-name');
      return { success: true, needsName: true };
    }
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function logout() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  revalidatePath('/');
}

export async function signUp(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const inviteCode = formData.get('invite_code') as string;

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters' };
  }

  // Validate invite code (server-side only — never exposed to client)
  const expectedCode = process.env.INVITE_CODE;
  if (!expectedCode || inviteCode !== expectedCode) {
    return { error: 'Invalid invite code' };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: 'Unknown', role: 'staff' },
  });

  if (error) return { error: error.message };

  return { success: true, message: 'Account created! Sign in with your email and password.' };
}

export async function updateUserRole(formData: FormData) {
  const userId = formData.get('userId') as string;
  const newRole = formData.get('role') as string;

  if (!userId || !['admin', 'staff'].includes(newRole)) {
    return { error: 'Invalid user ID or role' };
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: requester } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!requester || requester.role !== 'admin') {
    return { error: 'Only admins can change roles' };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from('users')
    .update({ role: newRole })
    .eq('id', userId);

  if (error) return { error: 'Update failed: ' + error.message };

  revalidatePath('/dashboard/admin');
  return { success: true };
}

export async function claimStaffSlot(formData: FormData) {
  const slotId = formData.get('slotId') as string;
  const slotName = formData.get('slotName') as string;

  if (!slotId || !slotName) return { error: 'Invalid slot selection' };

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: slot } = await supabase
    .from('staff_slots')
    .select('id, name')
    .eq('id', slotId)
    .single();

  if (!slot) return { error: 'Staff slot not found' };

  const { data: existingProfile } = await supabase
    .from('users')
    .select('id, name')
    .eq('id', user.id)
    .single();

  if (existingProfile?.name && existingProfile.name !== 'Unknown') {
    return { error: 'You already have a name assigned' };
  }

  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('name', slot.name)
    .maybeSingle();

  if (existingUser && existingUser.id !== user.id) {
    return { error: 'This staff name is already taken' };
  }

  const adminClient = createAdminClient();
  const { error: upsertError } = await adminClient
    .from('users')
    .upsert({
      id: user.id,
      email: user.email,
      name: slot.name,
      role: 'staff',
    }, { onConflict: 'id' });

  if (upsertError) return { error: upsertError.message };

  revalidatePath('/dashboard');
  return { success: true, name: slot.name };
}

export async function createStaffSlot(formData: FormData) {
  const name = formData.get('name') as string;
  if (!name || name.trim().length === 0) return { error: 'Name is required' };

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') return { error: 'Admins only' };

  const { error } = await supabase
    .from('staff_slots')
    .insert({ name: name.trim() });

  if (error) return { error: error.message };

  revalidatePath('/dashboard/admin');
  return { success: true };
}

export async function deleteStaffSlot(formData: FormData) {
  const slotId = formData.get('slotId') as string;
  if (!slotId) return { error: 'Slot ID required' };

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') return { error: 'Admins only' };

  const { error } = await supabase
    .from('staff_slots')
    .delete()
    .eq('id', slotId);

  if (error) return { error: error.message };

  revalidatePath('/dashboard/admin');
  return { success: true };
}

export async function adminResetPassword(formData: FormData) {
  const userId = formData.get('userId') as string;
  const newPassword = formData.get('password') as string;

  if (!userId || !newPassword || newPassword.length < 6) {
    return { error: 'User ID and a password of at least 6 characters are required' };
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: requester } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!requester || requester.role !== 'admin') return { error: 'Admins only' };

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) return { error: error.message };
  revalidatePath('/dashboard/admin');
  return { success: true };
}

export async function renameStaffSlot(formData: FormData) {
  const slotId = formData.get('slotId') as string;
  const newName = formData.get('name') as string;

  if (!slotId || !newName || newName.trim().length === 0) {
    return { error: 'Slot ID and new name are required' };
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') return { error: 'Admins only' };

  const { error } = await supabase
    .from('staff_slots')
    .update({ name: newName.trim() })
    .eq('id', slotId);

  if (error) return { error: error.message };

  revalidatePath('/dashboard/admin');
  return { success: true };
}
