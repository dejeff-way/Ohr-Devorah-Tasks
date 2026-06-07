# Ohr Devorah Tasks — Security Hardening & Bug Fix Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Close all security holes, remove dead code, fix data bugs, and harden the app for real staff usage.

**Architecture:** Next.js 16 App Router + Supabase (PostgreSQL + RLS + Auth). Proxy-based auth gate (src/proxy.ts). Server actions for mutations. Admin client (service role key) for privileged operations.

**Tech Stack:** Next.js 16, TypeScript, Supabase, Zod, Tailwind CSS

**Current state:** Site is live at ohr-devora-tasks.vercel.app. 2 users in DB (admin + one staff). 3 test tasks. Proxy auth gate is working (redirects unauthenticated users). All 8 migrations applied.

---

## Phase 1: Security — Close the holes (CRITICAL)

### Task 1: Lock down the backfill API route

**Objective:** The `/api/backfill` endpoint uses the service role key with NO auth check. Any logged-in user (staff included) can trigger it. Add admin-only guard.

**File:** `src/app/api/backfill/route.ts`

**Current code (broken):**
```ts
export async function GET() {
  const admin = createAdminClient();
  // ...no auth check...
}
```

**Fix:**
```ts
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  // Auth gate: require admin
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

  // Now proceed with admin client
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
```

**Verify:** `curl -s https://ohr-devora-tasks.vercel.app/api/backfill` should redirect to login (307). Build locally with `npm run build` — no type errors.

---

### Task 2: Remove seedAdmin and seedStaffUsers server actions

**Objective:** These are callable by ANY client via server action POST. `seedAdmin` reads env passwords. `seedStaffUsers` creates accounts with hardcoded password `OhrDevora123!`. Both must be removed from production.

**File:** `src/app/auth/actions.ts`

**Action:** Delete the `seedAdmin` function (lines 45-78) and `seedStaffUsers` function (lines 80-121) entirely. Also remove the unused `cookies` import on line 6.

**Also check:** `src/app/auth/login/page.tsx` — if there are any buttons/UI that call these functions, remove those too.

**Verify:** `npm run build` passes. No references to `seedAdmin` or `seedStaffUsers` remain in any .tsx files.

---

### Task 3: Gate open registration — admin-invite-only signup

**Objective:** The `signUp` action uses admin client to create auto-confirmed users. Anyone can register. For a school staff app, registration should require an admin invite or at minimum an invite code.

**File:** `src/app/auth/actions.ts` — `signUp` function (lines 181-203)

**Simplest fix:** Remove the "Create an account" button from the login page entirely. Staff accounts should only be created by the admin via the admin dashboard. The `signUp` server action should be deleted or gated behind admin auth.

**Option A (recommended — remove self-registration):**
- Delete the `signUp` function from `src/app/auth/actions.ts`
- Remove the "Create an account" toggle and registration form from `src/app/auth/login/page.tsx`
- Admin creates staff accounts from `/dashboard/admin` using the existing user management UI

**Option B (invite code):**
- Add an `INVITE_CODE` env var
- Require it in the signUp form
- Validate before creating the user

**Verify:** Login page shows only sign-in, no registration. `npm run build` passes.

---

### Task 4: Add server-side admin route guard in proxy

**Objective:** The proxy only checks "is user authenticated?" — it doesn't check roles. Staff can hit `/dashboard/admin` and briefly see admin UI before client redirect fires. Add server-side role check.

**File:** `src/proxy.ts`

**Current code:**
```ts
const publicPaths = ['/auth/login', '/auth/callback', '/auth/pick-name'];

export async function proxy(request: NextRequest) {
  // ...auth check only...
  if (!user) { redirect to /auth/login }
  return supabaseResponse;
}
```

**Fixed code — add after the `if (!user)` block:**
```ts
// Admin route guard — server-side role check
if (pathname.startsWith('/dashboard/admin')) {
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }
}
```

**Tradeoff:** This adds a DB query on every admin page load. Acceptable for a school app with <10 concurrent users. For scale, cache the role in a cookie or JWT claim.

**Verify:** Log in as staff user → navigate to `/dashboard/admin` → should redirect to `/dashboard` without showing admin UI.

---

## Phase 2: Database cleanup

### Task 5: Drop zombie RLS policies (migration 00009)

**Objective:** Three stale policies from migration 00001 were never dropped. They use the old recursive `EXISTS (SELECT 1 FROM users...)` pattern. They overlap with the clean policies from 00007/00008. Drop them.

**File:** Create `supabase/migrations/00009_drop_zombie_policies.sql`

```sql
-- Drop stale policies from 00001 that overlap with the clean ones from 00007/00008

-- task_assignees: old INSERT policy (uses recursive EXISTS)
DROP POLICY IF EXISTS "Admins can manage assignments" ON public.task_assignees;

-- task_assignees: old DELETE policy (uses recursive EXISTS)
DROP POLICY IF EXISTS "Admins can delete assignments" ON public.task_assignees;

-- task_assignees: old SELECT policy (uses recursive EXISTS)
DROP POLICY IF EXISTS "Users can read own task assignments" ON public.task_assignees;
```

**Run:** `psql` against the live database with the DB password.

**Verify after:** Query `pg_policies` — `task_assignees` should have exactly 2 policies: `"Read assignments"` (SELECT) and `"Manage assignments"` (ALL). No more recursive ones.

---

### Task 6: Add UNIQUE constraint on users.name

**Objective:** Prevent the `claimStaffSlot` race condition where two users claim the same staff name simultaneously. Add a UNIQUE constraint at the database level.

**File:** Create `supabase/migrations/00010_unique_user_name.sql`

```sql
-- Prevent two users from having the same display name
-- This makes claimStaffSlot atomic at the DB level
ALTER TABLE public.users
  ADD CONSTRAINT users_name_unique UNIQUE (name);
```

**Risk:** If there are already duplicate names in the DB, the migration will fail. Check first:
```sql
SELECT name, count(*) FROM public.users GROUP BY name HAVING count(*) > 1;
```

**Verify:** Try to insert two users with the same name — should fail with unique violation.

---

### Task 7: Verify malkybirnbaum12 admin role

**Objective:** `malkybirnbaum12@gmail.com` has `role: 'admin'` in `public.users` but no metadata in `auth.users`. Confirm this is intentional.

**Action:** ASK TZVI — Is Malky supposed to be admin? If yes, leave it. If no, run:
```sql
UPDATE public.users SET role = 'staff' WHERE email = 'malkybirnbaum12@gmail.com';
```

---

## Phase 3: Bug fixes

### Task 8: Fix recurrence not editable after creation

**Objective:** `updateTask` in `src/app/dashboard/actions.ts` omits the `recurrence` field from the update payload. Tasks created as "weekly" can never be changed.

**File:** `src/app/dashboard/actions.ts` — `updateTask` function

**Current (line 145):**
```ts
const { title, description, date_required, completion_level, assignee_ids } = parsed.data;
```

**Fix:**
```ts
const { title, description, date_required, recurrence, completion_level, assignee_ids } = parsed.data;
```

**Current (line 149):**
```ts
.update({ title, description, date_required, completion_level, metadata })
```

**Fix:**
```ts
.update({ title, description, date_required, recurrence, completion_level, metadata })
```

**Verify:** Edit a task's recurrence from "none" to "weekly" → save → reload → should still show "weekly".

---

### Task 9: Remove debug code from updateUserRole

**Objective:** Lines 149-157 in `src/app/auth/actions.ts` are debug queries that read 5 users for no reason.

**File:** `src/app/auth/actions.ts` — `updateUserRole` function

**Delete lines 149-157:**
```ts
  // Debug: verify the admin client can read users
  const { data: testRead, error: testError } = await adminClient
    .from('users')
    .select('id, email, role')
    .limit(5);

  if (testError) {
    return { error: `Admin client error: ${testError.message}` };
  }
```

**Verify:** `npm run build` passes. Role updates still work.

---

### Task 10: Remove unused cookies import

**Objective:** Line 6 of `src/app/auth/actions.ts` imports `cookies` from `next/headers` but never uses it.

**File:** `src/app/auth/actions.ts` line 6

**Delete:**
```ts
import { cookies } from 'next/headers';
```

**Verify:** `npm run build` passes — no unused import warning.

---

## Phase 4: Cleanup & polish

### Task 11: Remove dead metadata UI components

**Objective:** `metadata-fields.tsx` and `metadata-display.tsx` are unused. The metadata column exists in the DB and the Zod schema parses it, but no UI renders it. Remove the dead components.

**Files to delete:**
- `src/components/metadata-fields.tsx`
- `src/components/metadata-display.tsx`

**Also check:** Any imports of these components in other files. Remove those imports.

**Verify:** `npm run build` passes. No references to `MetadataFields` or `MetadataDisplay` remain.

---

### Task 12: Extract requireAdmin helper for server actions

**Objective:** The pattern `getUser → query users.role → check admin` is duplicated 6+ times across auth/actions.ts and dashboard/actions.ts. Extract a helper to DRY it up and ensure consistent behavior.

**File:** Create `src/lib/auth-helpers.ts`

```ts
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function requireAuth() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return { supabase, user };
}

export async function requireAdmin() {
  const { supabase, user } = await requireAuth();
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    throw new Error('Admins only');
  }

  return { supabase, user, profile };
}
```

Then refactor all server actions to use these helpers instead of the inline pattern.

**Verify:** All admin-gated actions still work. `npm run build` passes.

---

## Phase 5: Commit & deploy

### Task 13: Commit, push, verify deployment

**Steps:**
1. `git add -A`
2. `git commit -m "security: close open endpoints, remove seed actions, add admin route guard, drop zombie policies, fix recurrence update, add unique name constraint"`
3. `git push origin main`
4. Wait for Vercel auto-deploy
5. Verify:
   - `/api/backfill` returns 401/403 for non-admin
   - `/dashboard/admin` redirects staff to `/dashboard`
   - Registration removed from login page
   - Task recurrence editable
   - No seed buttons anywhere

---

## Execution order

| Priority | Task | Risk if skipped |
|----------|------|----------------|
| P0 | Task 1 — Lock backfill API | Any logged-in user can trigger admin operations |
| P0 | Task 2 — Remove seed actions | Any client can create admin accounts with known password |
| P0 | Task 3 — Remove open registration | Anyone can create accounts on a staff-only app |
| P1 | Task 4 — Admin route guard in proxy | Staff briefly sees admin UI |
| P1 | Task 5 — Drop zombie policies | Stale recursive policies evaluated on every query |
| P1 | Task 7 — Verify Malky's role | Possible unintended admin privilege |
| P2 | Task 6 — Unique name constraint | Race condition on staff slot claim |
| P2 | Task 8 — Fix recurrence update | Can't edit task recurrence after creation |
| P2 | Task 9 — Remove debug code | Unnecessary DB query on every role change |
| P3 | Task 10 — Remove unused import | Lint noise |
| P3 | Task 11 — Remove dead metadata UI | Dead code clutter |
| P3 | Task 12 — Extract requireAdmin helper | Code duplication (6+ copies) |
| P3 | Task 13 — Commit & deploy | Ship it |

---

## Open question for Tzvi

**Is `malkybirnbaum12@gmail.com` supposed to be admin?** She's currently admin in the DB. If she should be staff, I'll downgrade her in the same migration. Need your answer before Task 7.
