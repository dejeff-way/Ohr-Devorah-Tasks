import { redirect } from 'next/navigation';

/**
 * This route was a second, slightly older copy of the "Staff" tab on
 * /dashboard/admin — same table, same role toggle, but without password resets
 * or name-slot management, and nothing in the app ever linked to it. Rather
 * than maintain two versions of the same screen that could drift apart, it now
 * forwards to the real one so existing bookmarks keep working.
 */
export default function ManageUsersPage() {
  redirect('/dashboard/admin');
}
