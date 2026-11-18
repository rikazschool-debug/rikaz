-- REVIEW PACKAGE ONLY — not applied anywhere. Guardian first sign-in by national ID for a school-created (staged) account.
-- Scope: guardians whose account is staged in account_setup (kind='guardian', need_phone, not completed).
-- Linked accounts, students, teachers, staff and owners keep the exact current path (activation=false).

-- 1) Challenge marks an activation; nothing about the account changes when the code is issued.
alter table public.id_login_challenges
  add column if not exists activation boolean not null default false,
  add column if not exists guardian_id uuid,
  add column if not exists activated_at timestamptz;
create index if not exists id_login_challenges_activated_user on public.id_login_challenges(user_id) where activated_at is not null;

-- 2) Find the ONE staged guardian account for this ID, using only the mobile already on the school record.
create or replace function public._idl_resolve_staged_guardian(_nid text)
returns table(user_id uuid, phone text, guardian_id uuid, problem text)
language plpgsql stable security definer set search_path = public, auth as $$
declare n text := _idl_nid(_nid); uids uuid[]; gids uuid[]; phones text[]; auth_phone text;
begin
  if n is null or n !~ '^[12]\d{9}$' then return query select null::uuid, null::text, null::uuid, 'invalid'; return; end if;
  select array_agg(distinct a.user_id), array_agg(distinct a.subject_id)
    into uids, gids
    from account_setup a join guardians g on g.id = a.subject_id
   where a.kind = 'guardian' and a.need_phone and a.completed_at is null
     and g.user_id is null and _idl_nid(g.national_id) = n;
  if coalesce(array_length(uids,1),0) = 0 then return query select null::uuid, null::text, null::uuid, 'no_account'; return; end if;
  if array_length(uids,1) > 1 or array_length(gids,1) > 1 then return query select null::uuid, null::text, null::uuid, 'conflict_account'; return; end if;
  -- every school record with this ID must agree on one mobile; the code goes only there
  select array_agg(distinct _idl_phone(g.phone)) filter (where _idl_phone(g.phone) is not null) into phones
    from guardians g where _idl_nid(g.national_id) = n;
  if coalesce(array_length(phones,1),0) = 0 then return query select null::uuid, null::text, null::uuid, 'no_phone'; return; end if;
  if array_length(phones,1) > 1 then return query select null::uuid, null::text, null::uuid, 'conflict_phone'; return; end if;
  -- the staged login must carry that same mobile (it was created from the record); otherwise refuse
  select _idl_phone(u.phone) into auth_phone from auth.users u where u.id = uids[1];
  if auth_phone is distinct from phones[1] then return query select null::uuid, null::text, null::uuid, 'conflict_phone'; return; end if;
  return query select uids[1], phones[1], gids[1], null::text;
end $$;
revoke all on function public._idl_resolve_staged_guardian(text) from public, anon, authenticated;
grant execute on function public._idl_resolve_staged_guardian(text) to service_role;

-- 3) Issue: unchanged limits and resolution; only a 'no_account' result falls through to the staged-guardian lookup.
create or replace function public._idl_issue(_nid text, _code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare h text := _idl_hash(coalesce(_idl_nid(_nid),'')); r record; s record; last_at timestamptz; n int; cid uuid;
  act boolean := false; gid uuid; uid uuid; ph text;
begin
  -- serialise concurrent requests for the same ID so the cooldown cannot be raced
  perform pg_advisory_xact_lock(hashtextextended('idl:' || h, 0));
  select max(created_at), count(*) into last_at, n from id_login_challenges where nid_hash = h and created_at > now() - interval '15 minutes';
  if last_at is not null and last_at > now() - interval '60 seconds' then return jsonb_build_object('error','cooldown'); end if;
  if n >= 3 then return jsonb_build_object('error','too_many'); end if;
  select * into r from _idl_resolve(_nid);
  if r.problem = 'no_account' then
    select * into s from _idl_resolve_staged_guardian(_nid);
    if s.problem is not null then return jsonb_build_object('error', s.problem); end if;
    act := true; uid := s.user_id; ph := s.phone; gid := s.guardian_id;
  elsif r.problem is not null then return jsonb_build_object('error', r.problem);
  else uid := r.user_id; ph := r.phone;
  end if;
  update id_login_challenges set used_at = now() where nid_hash = h and used_at is null;
  insert into id_login_challenges(nid_hash, user_id, phone, code_hash, expires_at, activation, guardian_id)
    values (h, uid, ph, '', now() + interval '5 minutes', act, gid) returning id into cid;
  update id_login_challenges set code_hash = _idl_hash(cid::text || ':' || _code) where id = cid;
  return jsonb_build_object('challenge', cid, 'user_id', uid, 'phone', ph, 'activation', act);
end $$;

-- 4) Verify: identical checks. Only an activation challenge, after a correct code, confirms the mobile and links — in one transaction.
create or replace function public._idl_verify(_challenge uuid, _code text)
returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare c id_login_challenges; a account_setup; g guardians; st text; login_nid text;
begin
  select * into c from id_login_challenges where id = _challenge for update;
  if not found then return jsonb_build_object('error','invalid'); end if;
  if c.used_at is not null then return jsonb_build_object('error','used'); end if;
  if c.expires_at < now() then return jsonb_build_object('error','expired'); end if;
  if c.attempts >= 5 then return jsonb_build_object('error','locked'); end if;
  if c.code_hash <> _idl_hash(c.id::text || ':' || coalesce(_code,'')) then
    update id_login_challenges set attempts = attempts + 1, used_at = case when attempts + 1 >= 5 then now() end where id = c.id;
    return jsonb_build_object('error', case when c.attempts + 1 >= 5 then 'locked' else 'wrong' end);
  end if;
  update id_login_challenges set used_at = now() where id = c.id;

  if not c.activation then
    -- existing path; flag only users activated by this flow who still lack a login email (retry after a failed email step)
    return jsonb_build_object('user_id', c.user_id,
      'needs_login_email', exists(select 1 from id_login_challenges x where x.user_id = c.user_id and x.activated_at is not null)
                            and exists(select 1 from auth.users u where u.id = c.user_id and u.email is null),
      'login_nid', (select _idl_nid(gg.national_id) from guardians gg where gg.user_id = c.user_id limit 1));
  end if;

  -- activation: lock the staged row and the guardian record, then re-check everything against the challenge
  select * into a from account_setup where user_id = c.user_id for update;
  select * into g from guardians where id = c.guardian_id for update;
  if g.id is null then return jsonb_build_object('error','not_found'); end if;
  if g.user_id is not null and g.user_id <> c.user_id then return jsonb_build_object('error','conflict_account'); end if;
  if _idl_phone(g.phone) is distinct from c.phone then return jsonb_build_object('error','conflict_phone'); end if;
  if a.user_id is null or a.kind <> 'guardian' or a.subject_id <> c.guardian_id then return jsonb_build_object('error','no_account'); end if;
  if a.completed_at is null then
    -- the code reached the school-record mobile: that is the phone confirmation
    update auth.users set phone_confirmed_at = coalesce(phone_confirmed_at, now())
     where id = c.user_id and _idl_phone(phone) = c.phone;
    if not found then return jsonb_build_object('error','conflict_phone'); end if;
    st := _complete_account_setup(c.user_id, false);  -- links guardians.user_id, activates memberships, writes access_audit
    if st <> 'done' then raise exception 'activation failed'; end if;
  end if;
  update id_login_challenges set activated_at = now() where id = c.id;
  login_nid := _idl_nid(g.national_id);
  return jsonb_build_object('user_id', c.user_id, 'activated', true,
    'needs_login_email', exists(select 1 from auth.users u where u.id = c.user_id and u.email is null), 'login_nid', login_nid);
end $$;
