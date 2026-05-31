-- Migration 003: Supabase-first store state + optional normalized tables
-- Execute no SQL Editor do Supabase

-- Garante tabela JSONB principal (idempotente)
create table if not exists public.menu_store_state (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.menu_store_state enable row level security;

drop policy if exists "menu_store_state_select_all" on public.menu_store_state;
create policy "menu_store_state_select_all"
on public.menu_store_state for select to anon, authenticated using (true);

drop policy if exists "menu_store_state_write_authenticated" on public.menu_store_state;
create policy "menu_store_state_write_authenticated"
on public.menu_store_state for all to authenticated using (true) with check (true);

-- Cupons normalizados (opcional — app usa JSON em menu_store_state.data.cupons)
create table if not exists public.cupons (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  codigo text not null,
  tipo_desconto text not null default 'valor' check (tipo_desconto in ('valor', 'percentual')),
  valor_desconto numeric(10,2),
  percentual_desconto numeric(5,2),
  ativo boolean not null default true,
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, codigo)
);

alter table public.cupons enable row level security;

drop policy if exists "cupons_select_public" on public.cupons;
create policy "cupons_select_public"
on public.cupons for select to anon, authenticated
using (ativo = true);

drop policy if exists "cupons_write_authenticated" on public.cupons;
create policy "cupons_write_authenticated"
on public.cupons for all to authenticated using (true) with check (true);

-- Foco da capa da loja (Minha Loja — crop/posicionamento)
alter table public.empresas
  add column if not exists capa_foco_x numeric(5,2) default 50,
  add column if not exists capa_foco_y numeric(5,2) default 50;

-- Ícone de categoria (quando migrar catálogo para tabelas relacionais)
alter table public.categorias
  add column if not exists icone text;

-- Realtime opcional (habilite manualmente se desejar):
-- alter publication supabase_realtime add table public.menu_store_state;
