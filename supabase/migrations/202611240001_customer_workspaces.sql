begin;
create table public.customer_workspaces (
  owner_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  career_goal text not null check (char_length(career_goal) <= 500),
  next_step text not null check (char_length(next_step) <= 500),
  revision uuid not null default gen_random_uuid()
);
alter table public.customer_workspaces enable row level security;
revoke all on public.customer_workspaces from public, anon, authenticated;
grant select on public.customer_workspaces to authenticated;
grant insert (career_goal, next_step), update (career_goal, next_step)
  on public.customer_workspaces to authenticated;

create policy workspace_read on public.customer_workspaces for select to authenticated
  using (owner_id = (select auth.uid()));
create policy workspace_create on public.customer_workspaces for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy workspace_edit on public.customer_workspaces for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create function public.customer_workspace_revision() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.revision := pg_catalog.gen_random_uuid();
  return new;
end;
$$;
revoke all on function public.customer_workspace_revision() from public, anon, authenticated;
create trigger customer_workspace_revision before update on public.customer_workspaces
  for each row execute function public.customer_workspace_revision();
commit;
