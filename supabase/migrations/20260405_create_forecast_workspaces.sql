create table if not exists public.forecast_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  workspace jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.forecast_workspaces enable row level security;

drop policy if exists "forecast_workspaces_select_own" on public.forecast_workspaces;
create policy "forecast_workspaces_select_own"
  on public.forecast_workspaces
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "forecast_workspaces_insert_own" on public.forecast_workspaces;
create policy "forecast_workspaces_insert_own"
  on public.forecast_workspaces
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "forecast_workspaces_update_own" on public.forecast_workspaces;
create policy "forecast_workspaces_update_own"
  on public.forecast_workspaces
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
