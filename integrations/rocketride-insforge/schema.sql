create extension if not exists pgcrypto;

create table if not exists public.intent_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.investigation_results (
  id uuid primary key default gen_random_uuid(),
  component_id text not null unique,
  component_name text,
  status text not null check (
    status in (
      'matches_design',
      'verification_incomplete',
      'unreviewed_drift',
      'insufficient_evidence'
    )
  ),
  reviewed_value text,
  implemented_value text,
  confidence double precision not null check (
    confidence >= 0 and confidence <= 1
  ),
  drive_evidence text,
  slack_evidence text,
  linear_evidence text,
  github_evidence text,
  conclusion text not null,
  recommended_action text not null,
  review_status text not null default 'pending' check (
    review_status in (
      'pending',
      'approved',
      'rejected',
      'needs_changes'
    )
  ),
  intent_profile_id uuid not null references public.intent_profiles(id)
    on update restrict
    on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.driftlens_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists driftlens_intent_profiles_updated_at
  on public.intent_profiles;
create trigger driftlens_intent_profiles_updated_at
before update on public.intent_profiles
for each row execute function public.driftlens_set_updated_at();

drop trigger if exists driftlens_investigation_results_updated_at
  on public.investigation_results;
create trigger driftlens_investigation_results_updated_at
before update on public.investigation_results
for each row execute function public.driftlens_set_updated_at();
