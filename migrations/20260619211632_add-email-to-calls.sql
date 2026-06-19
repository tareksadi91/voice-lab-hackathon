-- Claim a profile: the expert saves their email to keep getting matched.
alter table public.calls add column if not exists email text;
