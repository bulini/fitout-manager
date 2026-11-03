-- Boxyland Manager — template di to-do list
-- Esegui in Supabase: SQL Editor > New query > incolla > Run

create table public.task_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.task_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.task_templates(id) on delete cascade,
  title text not null,
  notes text,
  priority smallint not null default 2 check (priority between 1 and 3),
  -- giorni rispetto alla data base (apertura): -30 = 30 giorni prima, 0 = il giorno stesso, null = senza scadenza
  offset_days int,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index task_template_items_tpl_idx on public.task_template_items(template_id);

-- traccia da quale template arriva una task
alter table public.tasks add column template_id uuid references public.task_templates(id) on delete set null;

create trigger task_templates_touch before update on public.task_templates
  for each row execute function public.touch_updated_at();

alter table public.task_templates enable row level security;
alter table public.task_template_items enable row level security;

create policy "team gestisce template" on public.task_templates
  for all to authenticated using (true) with check (true);
create policy "team gestisce voci template" on public.task_template_items
  for all to authenticated using (true) with check (true);
