-- Confer: persisted interview results (dossier + matched paid requests).
-- Written/read server-side with the project admin API key (full access),
-- so no RLS policies are required for the hackathon build.
create table if not exists public.calls (
  id          text primary key,
  "createdAt" timestamptz not null default now(),
  dossier     jsonb not null,
  paid_matches jsonb not null default '[]'::jsonb
);

-- Latest-call lookup: GET ?order=createdAt.desc&limit=1
create index if not exists calls_created_at_desc on public.calls ("createdAt" desc);
