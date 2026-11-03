-- Boxyland Manager — schema iniziale
-- Esegui in Supabase: SQL Editor > New query > incolla > Run

create extension if not exists "pgcrypto";

-- ============ PROFILI (impostazioni notifiche per utente) ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  telegram_chat_id text,
  notify_push boolean not null default true,
  notify_email boolean not null default true,
  notify_telegram boolean not null default false,
  reminder_days_before int not null default 3 check (reminder_days_before between 0 and 60),
  created_at timestamptz not null default now()
);

-- crea il profilo automaticamente quando nasce un utente
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ PUNTI VENDITA ============
create type public.store_status as enum ('pianificato', 'in_apertura', 'aperto', 'chiuso');

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  city text,
  lat double precision not null,
  lng double precision not null,
  status public.store_status not null default 'in_apertura',
  opening_date date,
  manager_name text,
  notes text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ TO-DO PER PUNTO VENDITA ============
create type public.task_status as enum ('da_fare', 'in_corso', 'fatto');

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  title text not null,
  notes text,
  due_date date,
  priority smallint not null default 2 check (priority between 1 and 3), -- 1 alta, 2 media, 3 bassa
  status public.task_status not null default 'da_fare',
  assigned_to uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_store_idx on public.tasks(store_id);
create index tasks_open_due_idx on public.tasks(due_date) where status <> 'fatto';

-- updated_at + completed_at automatici
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  if tg_table_name = 'tasks' then
    if new.status = 'fatto' and (old.status is distinct from 'fatto') then
      new.completed_at = now();
    elsif new.status <> 'fatto' then
      new.completed_at = null;
    end if;
  end if;
  return new;
end $$;

create trigger stores_touch before update on public.stores
  for each row execute function public.touch_updated_at();
create trigger tasks_touch before update on public.tasks
  for each row execute function public.touch_updated_at();

-- ============ WEB PUSH ============
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- ============ LOG REMINDER (evita doppi invii) ============
create table public.reminder_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('push', 'email', 'telegram')),
  sent_on date not null default current_date,
  task_count int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, channel, sent_on)
);

-- ============ RLS ============
-- App interna di team: ogni utente loggato vede e modifica punti vendita e task.
alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.tasks enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.reminder_log enable row level security;

create policy "profili visibili al team" on public.profiles
  for select to authenticated using (true);
create policy "modifico solo il mio profilo" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "team legge stores" on public.stores for select to authenticated using (true);
create policy "team crea stores" on public.stores for insert to authenticated with check (true);
create policy "team modifica stores" on public.stores for update to authenticated using (true) with check (true);
create policy "team elimina stores" on public.stores for delete to authenticated using (true);

create policy "team legge tasks" on public.tasks for select to authenticated using (true);
create policy "team crea tasks" on public.tasks for insert to authenticated with check (true);
create policy "team modifica tasks" on public.tasks for update to authenticated using (true) with check (true);
create policy "team elimina tasks" on public.tasks for delete to authenticated using (true);

create policy "le mie subscription" on public.push_subscriptions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "il mio log" on public.reminder_log
  for select to authenticated using (user_id = auth.uid());
