-- Restores _idl_issue and _idl_verify exactly as in the platform (migration 20261107073830) and removes the new function.
-- New columns are left in place (harmless, default false) so no challenge history is lost; drop them manually if wanted.
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

drop function if exists public._idl_resolve_staged_guardian(text);
