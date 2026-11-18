-- Isolated test with FAKE data only. Run with test/run.sh against a throwaway local Postgres.
\set ON_ERROR_STOP on
create or replace function t_ok(cond boolean, name text) returns void language plpgsql as $$
begin if cond is not true then raise exception 'FAIL: %', name; end if; raise notice 'PASS: %', name; end $$;
-- code hash helper: tests know the code they issued
create or replace function t_issue(nid text, code text) returns jsonb language sql as $$ select public._idl_issue(nid, code) $$;
create or replace function t_reset_cooldown() returns void language sql as $$ update id_login_challenges set created_at = created_at - interval '1 hour' $$;

-- fixtures
insert into organizations(id) values ('00000000-0000-0000-0000-0000000000a1');
insert into schools(id, org_id) values ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1');
insert into students(id, school_id, full_name) values ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000b1','طالب وهمي');
-- G1 staged guardian (school-created, phone unconfirmed)
insert into auth.users(id, phone) values ('00000000-0000-0000-0000-000000000001','966500000001');
insert into guardians(id, school_id, national_id, phone) values ('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000b1','1000000001','0500000001');
insert into student_guardians values ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000d1');
insert into memberships(id, user_id, org_id, school_id, role, is_active) values ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1','guardian',false);
insert into account_setup(user_id, school_id, kind, subject_id, membership_id, need_phone) values ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000b1','guardian','00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000e1',true);
-- G2 active guardian (already linked)
insert into auth.users(id, email, phone, phone_confirmed_at) values ('00000000-0000-0000-0000-000000000002','1000000002@guardian.rikaz.app','966500000002',now());
insert into guardians(id, school_id, user_id, national_id, phone) values ('00000000-0000-0000-0000-0000000000d2','00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-000000000002','1000000002','0500000002');
insert into memberships(user_id, org_id, school_id, role, is_active) values ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1','guardian',true);
-- G3 guardian record, no account at all
insert into guardians(school_id, national_id, phone) values ('00000000-0000-0000-0000-0000000000b1','1000000003','0500000003');
-- G4 staged, but the auth login carries a different mobile than the school record
insert into auth.users(id, phone) values ('00000000-0000-0000-0000-000000000004','966500000999');
insert into guardians(id, school_id, national_id, phone) values ('00000000-0000-0000-0000-0000000000d4','00000000-0000-0000-0000-0000000000b1','1000000004','0500000004');
insert into account_setup(user_id, school_id, kind, subject_id, need_phone) values ('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-0000000000b1','guardian','00000000-0000-0000-0000-0000000000d4',true);
-- G5 same ID in two branches with two different staged logins (duplicate) → must refuse
insert into auth.users(id, phone) values ('00000000-0000-0000-0000-000000000051','966500000005'),('00000000-0000-0000-0000-000000000052',null);
insert into guardians(id, school_id, national_id, phone) values ('00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000b1','1000000005','0500000005'),('00000000-0000-0000-0000-0000000000f2','00000000-0000-0000-0000-0000000000b1','1000000005','0500000005');
insert into account_setup(user_id, school_id, kind, subject_id, need_phone) values ('00000000-0000-0000-0000-000000000051','00000000-0000-0000-0000-0000000000b1','guardian','00000000-0000-0000-0000-0000000000f1',true),('00000000-0000-0000-0000-000000000052','00000000-0000-0000-0000-0000000000b1','guardian','00000000-0000-0000-0000-0000000000f2',true);
-- T1 teacher with active account
insert into auth.users(id, email, phone, phone_confirmed_at) values ('00000000-0000-0000-0000-000000000007','t@staff.rikaz.app','966500000007',now());
insert into teachers(school_id, user_id, national_id, phone) values ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-000000000007','1000000007','0500000007');

-- 1. unknown ID
select t_ok(t_issue('1999999999','111111')->>'error' = 'not_found', 'unknown ID → not_found');
-- 2. record without any account
select t_ok(t_issue('1000000003','111111')->>'error' = 'no_account', 'guardian record without account → no_account (unchanged)');
-- 3. active guardian keeps the normal path
do $$ declare r jsonb; v jsonb; begin
  r := t_issue('1000000002','222222');
  perform t_ok((r->>'activation')::boolean = false and r->>'phone' = '966500000002', 'active guardian → normal challenge');
  v := _idl_verify((r->>'challenge')::uuid, '222222');
  perform t_ok(v->>'user_id' = '00000000-0000-0000-0000-000000000002' and v->>'activated' is null and (v->>'needs_login_email')::boolean = false, 'active guardian verify unchanged');
end $$;
-- 4. teacher unaffected
do $$ declare r jsonb; begin r := t_issue('1000000007','333333');
  perform t_ok((r->>'activation')::boolean = false and _idl_verify((r->>'challenge')::uuid,'333333')->>'user_id' = '00000000-0000-0000-0000-000000000007', 'teacher path unchanged'); end $$;
-- 5. staged guardian: issuing changes nothing; code only to the record mobile
do $$ declare r jsonb; w jsonb; begin
  r := t_issue('1000000001','444444');
  perform t_ok((r->>'activation')::boolean and r->>'phone' = '966500000001', 'staged guardian → activation challenge to record mobile');
  perform t_ok((select user_id from guardians where id='00000000-0000-0000-0000-0000000000d1') is null, 'not linked before OTP');
  perform t_ok((select not is_active from memberships where id='00000000-0000-0000-0000-0000000000e1'), 'membership inactive before OTP');
  perform t_ok((select phone_confirmed_at is null from auth.users where id='00000000-0000-0000-0000-000000000001'), 'phone unconfirmed before OTP');
  w := _idl_verify((r->>'challenge')::uuid, '000000');
  perform t_ok(w->>'error' = 'wrong' and (select user_id from guardians where id='00000000-0000-0000-0000-0000000000d1') is null, 'wrong code changes nothing');
end $$;
-- 6. cooldown on resend
select t_ok(t_issue('1000000001','555555')->>'error' = 'cooldown', 'resend within 60s → cooldown');
-- 7. phone changed on school record between issue and verify → refuse, nothing linked
do $$ declare r jsonb; v jsonb; begin
  perform t_reset_cooldown();
  r := t_issue('1000000001','666666');
  update guardians set phone='0511111111' where id='00000000-0000-0000-0000-0000000000d1';
  v := _idl_verify((r->>'challenge')::uuid, '666666');
  perform t_ok(v->>'error' = 'conflict_phone' and (select user_id from guardians where id='00000000-0000-0000-0000-0000000000d1') is null, 'record mobile changed mid-activation → refused');
  update guardians set phone='0500000001' where id='00000000-0000-0000-0000-0000000000d1';
end $$;
-- 8. successful activation
do $$ declare r jsonb; v jsonb; begin
  perform t_reset_cooldown();
  r := t_issue('1000000001','777777');
  v := _idl_verify((r->>'challenge')::uuid, '777777');
  perform t_ok((v->>'activated')::boolean and v->>'user_id' = '00000000-0000-0000-0000-000000000001', 'correct code → activated');
  perform t_ok((select user_id from guardians where id='00000000-0000-0000-0000-0000000000d1') = '00000000-0000-0000-0000-000000000001', 'guardian record linked');
  perform t_ok((select is_active from memberships where id='00000000-0000-0000-0000-0000000000e1'), 'membership activated');
  perform t_ok((select phone_confirmed_at is not null from auth.users where id='00000000-0000-0000-0000-000000000001'), 'phone confirmed');
  perform t_ok((select completed_at is not null from account_setup where user_id='00000000-0000-0000-0000-000000000001'), 'first-login step completed');
  perform t_ok((select count(*) from student_guardians where guardian_id='00000000-0000-0000-0000-0000000000d1') = 1, 'child link preserved');
  perform t_ok((select count(*) from memberships where user_id='00000000-0000-0000-0000-000000000001') = 1, 'no duplicate membership');
  perform t_ok((select count(*) from auth.users) = 6, 'no new auth account created');
  perform t_ok((v->>'needs_login_email')::boolean and v->>'login_nid' = '1000000001', 'server told to add the login email');
  perform t_ok(exists(select 1 from access_audit where action='account_setup_completed' and target_user='00000000-0000-0000-0000-000000000001'), 'audit row written');
  perform t_ok(_idl_verify((r->>'challenge')::uuid, '777777')->>'error' = 'used', 'replay → used');
end $$;
-- 9. after activation the same ID takes the normal path; retry still flags a missing email
do $$ declare r jsonb; v jsonb; begin
  perform t_reset_cooldown();
  r := t_issue('1000000001','888888');
  perform t_ok((r->>'activation')::boolean = false, 'activated guardian → normal path next time');
  v := _idl_verify((r->>'challenge')::uuid, '888888');
  perform t_ok((v->>'needs_login_email')::boolean, 'retry still adds the missing login email');
end $$;
-- 10. auth mobile differs from school record → refused at issue
select t_ok(t_issue('1000000004','111111')->>'error' = 'conflict_phone', 'staged login with another mobile → conflict_phone');
-- 11. two staged logins for one ID → refused
select t_ok(t_issue('1000000005','111111')->>'error' = 'conflict_account', 'duplicate staged logins → conflict_account');
