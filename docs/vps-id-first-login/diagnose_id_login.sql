-- READ-ONLY diagnosis for "تعذر إرسال رمز لهذا الرقم". Changes nothing. Run on the VPS database as an admin:
--   psql "$DB" -v nid=1012345678 -f diagnose_id_login.sql
-- Prints which of the five server reasons applies to this ID, plus what each matched record looks like (phones masked).
\set ON_ERROR_STOP on
select 'reason' as k, coalesce(problem, 'ok (code would be sent)') as v from public._idl_resolve(:'nid')
union all
select 'staged guardian (fix package)', coalesce(problem, 'would activate') from public._idl_resolve_staged_guardian(:'nid')
  where exists(select 1 from pg_proc where proname = '_idl_resolve_staged_guardian')
union all
select 'staged teacher (fix package)', coalesce(problem, 'would activate') from public._idl_resolve_staged_teacher(:'nid')
  where exists(select 1 from pg_proc where proname = '_idl_resolve_staged_teacher');

select src, (user_id is not null) as has_login, '••••••' || right(regexp_replace(coalesce(phone,''), '\D', '', 'g'), 3) as phone_tail,
       public._idl_phone(phone) is not null as phone_valid, extra
from (
  select 'teachers' src, t.user_id, t.phone, null::text extra from teachers t where public._idl_nid(t.national_id) = public._idl_nid(:'nid')
  union all select 'hr_employees', e.user_id, e.phone, e.status from hr_employees e where public._idl_nid(e.national_id) = public._idl_nid(:'nid')
  union all select 'guardians', g.user_id, g.phone, null from guardians g where public._idl_nid(g.national_id) = public._idl_nid(:'nid')
) x;

-- staged logins waiting for first sign-in for this ID (account exists but is not linked yet)
select a.kind, a.need_phone, a.need_password, a.completed_at is not null as completed
from account_setup a
left join guardians g on a.kind = 'guardian' and g.id = a.subject_id
left join teachers t on a.kind = 'teacher' and t.id = a.subject_id
where public._idl_nid(coalesce(g.national_id, t.national_id)) = public._idl_nid(:'nid');
