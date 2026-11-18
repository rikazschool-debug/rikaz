-- Copied verbatim from the platform snapshot (ebfc6fd3) for the isolated test only.
create or replace function public._idl_nid(_s text) returns text language sql immutable as $$ select nullif(regexp_replace(coalesce(_s,''), '\D', '', 'g'), '') $$;

create or replace function public._idl_phone(_s text) returns text language plpgsql immutable as $$
declare d text := regexp_replace(coalesce(_s,''), '\D', '', 'g');
begin
  if d ~ '^05\d{8}$' then d := '966' || substr(d, 2);
  elsif d ~ '^5\d{8}$' then d := '966' || d;
  elsif d ~ '^009665\d{8}$' then d := substr(d, 3);
  end if;
  return case when d ~ '^9665\d{8}$' then d end;
end $$;

create or replace function public._idl_hash(_s text) returns text language sql immutable set search_path = public, extensions as $$ select encode(extensions.digest('rikaz-idl:' || _s, 'sha256'), 'hex') $$;

create or replace function public._idl_issue(_nid text, _code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare h text := _idl_hash(coalesce(_idl_nid(_nid),'')); r record; last_at timestamptz; n int; cid uuid;
begin
  select max(created_at), count(*) into last_at, n from id_login_challenges where nid_hash = h and created_at > now() - interval '15 minutes';
  if last_at is not null and last_at > now() - interval '60 seconds' then return jsonb_build_object('error','cooldown'); end if;
  if n >= 3 then return jsonb_build_object('error','too_many'); end if;
  select * into r from _idl_resolve(_nid);
  if r.problem is not null then return jsonb_build_object('error', r.problem); end if;
  update id_login_challenges set used_at = now() where nid_hash = h and used_at is null;
  insert into id_login_challenges(nid_hash, user_id, phone, code_hash, expires_at)
    values (h, r.user_id, r.phone, '', now() + interval '5 minutes') returning id into cid;
  update id_login_challenges set code_hash = _idl_hash(cid::text || ':' || _code) where id = cid;
  return jsonb_build_object('challenge', cid, 'user_id', r.user_id, 'phone', r.phone);
end $$;

create or replace function public._idl_verify(_challenge uuid, _code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c id_login_challenges;
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
  return jsonb_build_object('user_id', c.user_id);
end $$;

CREATE OR REPLACE FUNCTION public._idl_resolve(_nid text)
 RETURNS TABLE(user_id uuid, phone text, problem text)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare n text := _idl_nid(_nid); uids uuid[]; phones text[]; raw_count int;
begin
  if n is null or n !~ '^[12]\d{9}$' then return query select null::uuid, null::text, 'invalid'; return; end if;
  with r as (
    select t.user_id, t.phone from teachers t where _idl_nid(t.national_id) = n
    union all select e.user_id, e.phone from hr_employees e where _idl_nid(e.national_id) = n and coalesce(e.status,'') <> 'terminated'
    union all select g.user_id, g.phone from guardians g where _idl_nid(g.national_id) = n
    union all select o.user_id, o.phone from org_owner_identity o where _idl_nid(o.national_id) = n
      and exists (select 1 from memberships m where m.user_id = o.user_id and m.role = 'org_owner' and m.is_active)
  )
  select array_agg(distinct r.user_id) filter (where r.user_id is not null),
         array_agg(distinct _idl_phone(r.phone)) filter (where _idl_phone(r.phone) is not null),
         count(*)
    into uids, phones, raw_count from r;
  if raw_count = 0 then return query select null::uuid, null::text, 'not_found'; return; end if;
  if coalesce(array_length(uids,1),0) = 0 then return query select null::uuid, null::text, 'no_account'; return; end if;
  if array_length(uids,1) > 1 then return query select null::uuid, null::text, 'conflict_account'; return; end if;
  if coalesce(array_length(phones,1),0) = 0 then return query select null::uuid, null::text, 'no_phone'; return; end if;
  if array_length(phones,1) > 1 then return query select null::uuid, null::text, 'conflict_phone'; return; end if;
  return query select uids[1], phones[1], null::text;
end $function$;

create or replace function public._complete_account_setup(_uid uuid, _password_changed boolean)
 returns text language plpgsql security definer set search_path to 'public','auth' as $function$
declare a account_setup; conf boolean; org uuid; begin
  select * into a from account_setup where user_id=_uid for update;
  if a.user_id is null or a.completed_at is not null then return 'none'; end if;
  if a.need_password and not _password_changed then raise exception 'يلزم تغيير كلمة المرور أولًا'; end if;
  if a.need_phone then
    select phone_confirmed_at is not null into conf from auth.users where id=_uid;
    if not coalesce(conf,false) then raise exception 'يلزم تأكيد الجوال برمز واتساب أولًا'; end if;
  end if;
  if a.kind = 'student' then update students set user_id=_uid where id=a.subject_id and (user_id is null or user_id=_uid);
  elsif a.kind = 'teacher' then update teachers set user_id=_uid where id=a.subject_id and (user_id is null or user_id=_uid);
  elsif a.kind = 'guardian' then update guardians set user_id=_uid where id=a.subject_id and (user_id is null or user_id=_uid); end if;
  if a.restore_active then update memberships set is_active=true where id=a.membership_id; end if;
  if a.restore_ids is not null then update memberships set is_active=true where id = any(a.restore_ids) and user_id=_uid and not branch_suspended; end if;
  update account_setup set need_password=false, need_phone=false, completed_at=now(), restore_ids=null, updated_at=now() where user_id=_uid;
  select org_id into org from schools where id=a.school_id;
  insert into access_audit(org_id, school_id, actor, action, target_user, target_membership, after, reason)
  values (org, a.school_id, _uid, 'account_setup_completed', _uid, a.membership_id, jsonb_build_object('kind', a.kind), 'أكمل خطوة الدخول الأول');
  return 'done';
end $function$;
