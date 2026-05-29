-- Persistencia do estado do cardapio (admin/publico) por slug.
create table if not exists public.menu_store_state (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_menu_store_state_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists menu_store_state_updated_at on public.menu_store_state;
create trigger menu_store_state_updated_at
before update on public.menu_store_state
for each row execute function public.set_menu_store_state_updated_at();

alter table public.menu_store_state enable row level security;

drop policy if exists "menu_store_state_select_all" on public.menu_store_state;
create policy "menu_store_state_select_all"
on public.menu_store_state
for select
to anon, authenticated
using (true);

drop policy if exists "menu_store_state_write_authenticated" on public.menu_store_state;
create policy "menu_store_state_write_authenticated"
on public.menu_store_state
for all
to authenticated
using (true)
with check (true);

