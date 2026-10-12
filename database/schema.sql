create table if not exists public.requirements (
  key text primary key,
  html text not null,
  updated_at timestamptz not null default now()
);

alter table public.requirements enable row level security;
