-- One atomic ledger per authenticated owner. No anonymous reads or writes.
create function public.valid_service_ledger(payload jsonb)
returns boolean language plpgsql immutable security invoker set search_path = '' as $$
declare r jsonb; k text; all_ids text[] := '{}'; student_ids text[] := '{}'; invoice_ids text[] := '{}'; periods text[] := '{}'; totals jsonb := '{}'; amount bigint;
begin
  if jsonb_typeof(payload) is distinct from 'object' or payload->>'version' is distinct from '1'
     or jsonb_typeof(payload->'revision') is distinct from 'number' or (payload->>'revision') !~ '^[0-9]+$'
     or (payload->>'revision')::numeric > 9007199254740991 or octet_length(payload::text) > 10000000 then return false; end if;
  foreach k in array array['students','invoices','payments'] loop
    if jsonb_typeof(payload->k) is distinct from 'array' or jsonb_array_length(payload->k) > 50000 then return false; end if;
    for r in select value from jsonb_array_elements(payload->k) loop
      if jsonb_typeof(r) is distinct from 'object' or jsonb_typeof(r->'id') is distinct from 'string' or length(r->>'id') not between 1 and 100 or (r->>'id') = any(all_ids) then return false; end if;
      all_ids := array_append(all_ids,r->>'id');
    end loop;
  end loop;
  for r in select value from jsonb_array_elements(payload->'students') loop
    if jsonb_typeof(r->'name') is distinct from 'string' or length(trim(r->>'name')) not between 1 and 120
       or jsonb_typeof(r->'archived') is distinct from 'boolean' then return false; end if;
    foreach k in array array['school','route','contact'] loop
      if jsonb_typeof(r->k) is distinct from 'string' or length(r->>k)>120 then return false; end if;
    end loop;
    if jsonb_typeof(r->'fee') is distinct from 'number' or (r->>'fee') !~ '^[0-9]+$' or (r->>'fee')::numeric not between 1 and 100000000 then return false; end if;
    student_ids := array_append(student_ids,r->>'id');
  end loop;
  for r in select value from jsonb_array_elements(payload->'invoices') loop
    if jsonb_typeof(r->'studentId') is distinct from 'string' or not ((r->>'studentId') = any(student_ids))
       or jsonb_typeof(r->'period') is distinct from 'string' or (r->>'period') !~ '^[0-9]{4}-[0-9]{2}$'
       or (r->>'period'||'-01')::date < date '1900-01-01'
       or jsonb_typeof(r->'due') is distinct from 'string' or (r->>'due') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
       or (r->>'due')::date < date '1900-01-01'
       or jsonb_typeof(r->'note') is distinct from 'string' or length(r->>'note')>300
       or jsonb_typeof(r->'amount') is distinct from 'number' or (r->>'amount') !~ '^[0-9]+$' or (r->>'amount')::numeric not between 1 and 100000000 then return false; end if;
    k := (r->>'studentId') || ':' || (r->>'period');
    if k = any(periods) then return false; end if;
    periods := array_append(periods,k); invoice_ids := array_append(invoice_ids,r->>'id');
  end loop;
  for r in select value from jsonb_array_elements(payload->'payments') loop
    if jsonb_typeof(r->'invoiceId') is distinct from 'string' or not ((r->>'invoiceId') = any(invoice_ids))
       or jsonb_typeof(r->'date') is distinct from 'string' or (r->>'date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or (r->>'date')::date < date '1900-01-01'
       or jsonb_typeof(r->'method') is distinct from 'string' or (r->>'method') not in ('Cash','GCash','Bank transfer','Other')
       or jsonb_typeof(r->'reference') is distinct from 'string' or length(r->>'reference')>120
       or jsonb_typeof(r->'voided') is distinct from 'boolean' or jsonb_typeof(r->'voidReason') is distinct from 'string'
       or length(r->>'voidReason')>300 or ((r->>'voided')::boolean and length(trim(r->>'voidReason'))=0)
       or jsonb_typeof(r->'amount') is distinct from 'number' or (r->>'amount') !~ '^[0-9]+$' or (r->>'amount')::numeric not between 1 and 100000000 then return false; end if;
    if not (r->>'voided')::boolean then
      k := r->>'invoiceId'; amount := coalesce((totals->>k)::bigint,0)+(r->>'amount')::bigint;
      totals := jsonb_set(totals,array[k],to_jsonb(amount));
    end if;
  end loop;
  for r in select value from jsonb_array_elements(payload->'invoices') loop
    if coalesce((totals->>(r->>'id'))::bigint,0)>(r->>'amount')::bigint then return false; end if;
  end loop;
  return true;
exception when others then return false;
end;
$$;
revoke all on function public.valid_service_ledger(jsonb) from public,anon;
grant execute on function public.valid_service_ledger(jsonb) to authenticated;
create table public.service_ledgers (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null check (revision between 1 and 9007199254740991),
  data jsonb not null check (public.valid_service_ledger(data)),
  last_mutation uuid not null,
  updated_at timestamptz not null default now(),
  constraint service_ledger_revision_matches check ((data->>'revision')::bigint = revision)
);
alter table public.service_ledgers enable row level security;
revoke all on public.service_ledgers from anon,authenticated;
grant select,insert,update on public.service_ledgers to authenticated;
create policy ledger_read_own on public.service_ledgers for select to authenticated
using (owner_id = (select auth.uid()) and coalesce((select auth.jwt()->>'is_anonymous'),'false') = 'false');
create policy ledger_insert_own on public.service_ledgers for insert to authenticated
with check (owner_id = (select auth.uid()) and coalesce((select auth.jwt()->>'is_anonymous'),'false') = 'false');
create policy ledger_update_own on public.service_ledgers for update to authenticated
using (owner_id = (select auth.uid()) and coalesce((select auth.jwt()->>'is_anonymous'),'false') = 'false')
with check (owner_id = (select auth.uid()) and coalesce((select auth.jwt()->>'is_anonymous'),'false') = 'false');
create function public.guard_service_ledger_revision() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.revision <> 1 then raise exception 'New ledger must start at revision 1'; end if;
  else
    if new.owner_id <> old.owner_id or new.revision <> old.revision+1 or new.last_mutation = old.last_mutation then
      raise exception 'Invalid ledger revision';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.guard_service_ledger_revision() from public,anon;
create trigger service_ledger_revision before insert or update on public.service_ledgers
for each row execute function public.guard_service_ledger_revision();
