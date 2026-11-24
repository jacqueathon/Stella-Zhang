-- Disposable DB only. Run after migration as test administrator; always roll back.
begin;
set local plpgsql.check_asserts = on;
insert into auth.users (id) values ('00000000-0000-4000-8000-00000000000a'),
                                   ('00000000-0000-4000-8000-00000000000b');
set local role anon;
do $$
begin
  begin perform * from public.customer_workspaces;
    raise exception 'anonymous SELECT succeeded'; exception when insufficient_privilege then null; end;
  begin insert into public.customer_workspaces (career_goal,next_step) values ('x','x');
    raise exception 'anonymous INSERT succeeded'; exception when insufficient_privilege then null; end;
  begin update public.customer_workspaces set next_step='x';
    raise exception 'anonymous UPDATE succeeded'; exception when insufficient_privilege then null; end;
end $$;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-00000000000a';
insert into public.customer_workspaces (career_goal,next_step) values ('A goal','A step');
do $$ begin
  assert (select owner_id = auth.uid() and career_goal = 'A goal' from public.customer_workspaces);
  begin insert into public.customer_workspaces (owner_id,career_goal,next_step)
    values ('00000000-0000-4000-8000-00000000000b','forged','x');
    raise exception 'explicit owner INSERT succeeded'; exception when insufficient_privilege then null; end;
  begin update public.customer_workspaces set owner_id='00000000-0000-4000-8000-00000000000b';
    raise exception 'owner reassignment succeeded'; exception when insufficient_privilege then null; end;
  begin delete from public.customer_workspaces;
    raise exception 'DELETE succeeded'; exception when insufficient_privilege then null; end;
end $$;

set local request.jwt.claim.sub = '00000000-0000-4000-8000-00000000000b';
do $$ begin
  assert not exists (select from public.customer_workspaces), 'B saw A';
  update public.customer_workspaces set next_step='forged' where owner_id='00000000-0000-4000-8000-00000000000a';
  assert not found, 'B updated A';
end $$;
insert into public.customer_workspaces (career_goal,next_step) values ('B goal','B step');
do $$ declare prior uuid; begin
  select revision into strict prior from public.customer_workspaces;
  update public.customer_workspaces set next_step='B revised' where revision=prior;
  assert found;
  update public.customer_workspaces set next_step='stale' where revision=prior;
  assert not found, 'stale edit succeeded';
  assert (select next_step='B revised' from public.customer_workspaces);
end $$;

set local request.jwt.claim.sub = '00000000-0000-4000-8000-00000000000a';
do $$ begin
  assert (select count(*)=1 from public.customer_workspaces);
  assert (select next_step='A step' from public.customer_workspaces);
  assert not exists (select from public.customer_workspaces where owner_id='00000000-0000-4000-8000-00000000000b');
  update public.customer_workspaces set next_step='forged' where owner_id='00000000-0000-4000-8000-00000000000b';
  assert not found, 'A updated B';
end $$;
-- Exercise WITH CHECK even if an explicit owner column grant is added later.
reset role;
grant insert (owner_id) on public.customer_workspaces to authenticated;
set local role authenticated;
do $$ begin
  begin insert into public.customer_workspaces (owner_id,career_goal,next_step)
    values ('00000000-0000-4000-8000-00000000000b','forged','x');
    raise exception 'WITH CHECK accepted forged owner'; exception when insufficient_privilege then null; end;
end $$;
rollback;
