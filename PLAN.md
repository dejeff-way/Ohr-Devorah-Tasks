# Ohr Devora Task Manager — Implementation Plan

## Architecture

**Stack:** Next.js 15 (App Router) + Supabase (Auth + PostgreSQL + RLS) + Tailwind CSS + Shadcn/ui

**Directory Layout:**
```
ohr-devora-tasks/
├── .env.local                 # Supabase URL/anon key, ADMIN_EMAIL/PASSWORD
├── supabase/
│   ├── migrations/
│   │   └── 00001_schema.sql   # Full DDL: users, tasks, task_assignments + RLS
│   └── seed.sql               # Admin + 7 staff users
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout with providers
│   │   ├── page.tsx           # Landing → redirect to /dashboard
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   │   └── page.tsx   # Login form
│   │   │   └── callback/
│   │   │       └── route.ts   # Auth callback for PKCE
│   │   └── dashboard/
│   │       ├── layout.tsx     # Auth guard + sidebar/nav
│   │       ├── admin/
│   │       │   └── page.tsx   # Admin master panel + user switcher
│   │       └── page.tsx       # Staff dashboard (own tasks)
│   ├── components/
│   │   ├── ui/                # Shadcn primitives
│   │   ├── task-card.tsx
│   │   ├── task-form.tsx      # Create/edit with multi-assignee
│   │   ├── task-board.tsx     # Columns by status
│   │   ├── user-switcher.tsx  # Admin: view-as-staff dropdown
│   │   └── sidebar.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts      # Browser client
│   │   │   ├── server.ts      # Server client
│   │   │   └── admin.ts       # Service-role client
│   │   └── utils.ts           # cn(), etc.
│   └── middleware.ts           # Route protection by role
```

## Phase 1 — DB Schema
- `users` — id, email, name, role (admin|staff)
- `tasks` — id, title, description, date_required, completion_level, created_by
- `task_assignees` — id, task_id, user_id (junction)

## Phase 2 — Auth Flow
- Supabase Auth with email/password
- Admin seeded from env vars
- 7 staff users pre-seeded
- middleware.ts checks auth + redirects

## Phase 3 — Dashboards
- Staff: tasks WHERE assigned to them
- Admin: ALL tasks, with filter by assignee

## Phase 4 — Task CRUD
- Form: title, description, date_required, multi-assignee, completion_level
- Card: compact with colored status badge
