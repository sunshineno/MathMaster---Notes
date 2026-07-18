-- MathMaster Notes v2.0.0
-- À exécuter une seule fois dans Supabase > SQL Editor.

create table if not exists public.user_notebooks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_notebooks enable row level security;

revoke all on table public.user_notebooks from anon;
grant select, insert, update, delete on table public.user_notebooks to authenticated;

drop policy if exists "Users can read their notebook" on public.user_notebooks;
create policy "Users can read their notebook"
on public.user_notebooks
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their notebook" on public.user_notebooks;
create policy "Users can create their notebook"
on public.user_notebooks
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their notebook" on public.user_notebooks;
create policy "Users can update their notebook"
on public.user_notebooks
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their notebook" on public.user_notebooks;
create policy "Users can delete their notebook"
on public.user_notebooks
for delete
to authenticated
using ((select auth.uid()) = user_id);
