create table if not exists public.finance_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.finance_data enable row level security;

drop policy if exists "finance_data_select_own" on public.finance_data;
create policy "finance_data_select_own"
on public.finance_data for select
using (auth.uid() = user_id);

drop policy if exists "finance_data_insert_own" on public.finance_data;
create policy "finance_data_insert_own"
on public.finance_data for insert
with check (auth.uid() = user_id);

drop policy if exists "finance_data_update_own" on public.finance_data;
create policy "finance_data_update_own"
on public.finance_data for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "finance_data_delete_own" on public.finance_data;
create policy "finance_data_delete_own"
on public.finance_data for delete
using (auth.uid() = user_id);
