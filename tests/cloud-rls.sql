begin;
insert into auth.users(id, email, is_anonymous) values
('00000000-0000-4000-8000-000000000001','rls-fixture-1@example.invalid',false),
('00000000-0000-4000-8000-000000000002','rls-fixture-2@example.invalid',false);
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}';
insert into public.service_ledgers(owner_id,revision,data,last_mutation) values
('00000000-0000-4000-8000-000000000001',1,'{"version":1,"revision":1,"students":[],"invoices":[],"payments":[]}','10000000-0000-4000-8000-000000000001');
do $$
begin
  if (select count(*) from public.service_ledgers) <> 1 then raise exception 'Owner cannot read own ledger'; end if;
end;
$$;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}';
do $$
declare n int;
begin
  if (select count(*) from public.service_ledgers) <> 0 then raise exception 'Cross-owner read allowed'; end if;
  update public.service_ledgers set revision=2,data=jsonb_set(data,'{revision}','2'),last_mutation='20000000-0000-4000-8000-000000000001';
  get diagnostics n = row_count;
  if n<>0 then raise exception 'Cross-owner update allowed'; end if;
  begin
    insert into public.service_ledgers(owner_id,revision,data,last_mutation) values
    ('00000000-0000-4000-8000-000000000003',1,'{"version":1,"revision":1,"students":[],"invoices":[],"payments":[]}','10000000-0000-4000-8000-000000000003');
    raise exception 'Cross-owner insert allowed';
  exception when insufficient_privilege then null; end;
end;
$$;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}';
update public.service_ledgers set revision=2,data=jsonb_set(data,'{revision}','2'),last_mutation='20000000-0000-4000-8000-000000000001' where revision=1;
do $$
declare n int;
begin
  update public.service_ledgers set revision=2,data=jsonb_set(data,'{revision}','2'),last_mutation='30000000-0000-4000-8000-000000000001' where revision=1;
  get diagnostics n = row_count;
  if n<>0 then raise exception 'Stale revision updated'; end if;
  if public.valid_service_ledger('{"version":1,"revision":1,"students":[],"invoices":[{}],"payments":[]}') then raise exception 'Malformed ledger accepted'; end if;
  begin
    update public.service_ledgers set revision=4,data=jsonb_set(data,'{revision}','4');
    raise exception 'Skipped revision allowed';
  exception when raise_exception then
    if sqlerrm <> 'Invalid ledger revision' then raise; end if;
  end;
end;
$$;
set local role anon;
do $$
begin
  begin
    perform 1 from public.service_ledgers;
    raise exception 'Anonymous read allowed';
  exception when insufficient_privilege then null; end;
end;
$$;
reset role;
select 'PASS: owner isolation, anonymous denial, insert/update protection, stale revision rejection, payload validation' as result;
rollback;
