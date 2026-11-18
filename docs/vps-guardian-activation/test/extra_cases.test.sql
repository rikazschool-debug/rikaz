-- Extra isolated cases requested on 2026-11-18 (FAKE data only). Loaded after guardian_activation.test.sql (reuses t_ok/t_issue).
\set ON_ERROR_STOP on
-- G6 staged guardian with two children
insert into auth.users(id, phone) values ('00000000-0000-0000-0000-000000000006','966500000006');
insert into students(id, school_id, full_name) values ('00000000-0000-0000-0000-0000000000c6','00000000-0000-0000-0000-0000000000b1','ابن أول'),('00000000-0000-0000-0000-0000000000c7','00000000-0000-0000-0000-0000000000b1','ابن ثان');
insert into guardians(id, school_id, national_id, phone) values ('00000000-0000-0000-0000-0000000000d6','00000000-0000-0000-0000-0000000000b1','1000000006','0500000006');
insert into student_guardians values ('00000000-0000-0000-0000-0000000000c6','00000000-0000-0000-0000-0000000000d6'),('00000000-0000-0000-0000-0000000000c7','00000000-0000-0000-0000-0000000000d6');
insert into memberships(id, user_id, org_id, school_id, role, is_active) values ('00000000-0000-0000-0000-0000000000e6','00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1','guardian',false);
insert into account_setup(user_id, school_id, kind, subject_id, membership_id, need_phone) values ('00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-0000000000b1','guardian','00000000-0000-0000-0000-0000000000d6','00000000-0000-0000-0000-0000000000e6',true);
-- G8 staged guardian with a malformed mobile on the school record
insert into auth.users(id, phone) values ('00000000-0000-0000-0000-000000000008',null);
insert into guardians(id, school_id, national_id, phone) values ('00000000-0000-0000-0000-0000000000d8','00000000-0000-0000-0000-0000000000b1','1000000008','12345');
insert into account_setup(user_id, school_id, kind, subject_id, need_phone) values ('00000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-0000000000b1','guardian','00000000-0000-0000-0000-0000000000d8',true);
-- G9 staged guardian for the expired-code case
insert into auth.users(id, phone) values ('00000000-0000-0000-0000-000000000019','966500000019');
insert into guardians(id, school_id, national_id, phone) values ('00000000-0000-0000-0000-0000000000db','00000000-0000-0000-0000-0000000000b1','1000000019','0500000019');
insert into account_setup(user_id, school_id, kind, subject_id, need_phone) values ('00000000-0000-0000-0000-000000000019','00000000-0000-0000-0000-0000000000b1','guardian','00000000-0000-0000-0000-0000000000db',true);

do $$ declare users_before int; r jsonb; v jsonb; begin
  select count(*) into users_before from auth.users;
  r := t_issue('1000000006','676767');
  perform t_ok((r->>'activation')::boolean and r->>'phone' = '966500000006', 'X1 multi-child staged guardian → activation challenge');
  v := _idl_verify((r->>'challenge')::uuid, '676767');
  perform t_ok((v->>'activated')::boolean and v->>'user_id' = '00000000-0000-0000-0000-000000000006', 'X2 multi-child guardian activated with own existing account');
  perform t_ok((select user_id from guardians where id='00000000-0000-0000-0000-0000000000d6') = '00000000-0000-0000-0000-000000000006', 'X3 guardians.user_id linked');
  perform t_ok((select is_active from memberships where id='00000000-0000-0000-0000-0000000000e6'), 'X4 guardian membership active');
  perform t_ok((select count(*) from student_guardians where guardian_id='00000000-0000-0000-0000-0000000000d6') = 2, 'X5 both children links preserved');
  perform t_ok((select phone from guardians where id='00000000-0000-0000-0000-0000000000d6') = '0500000006', 'X6 school mobile unchanged');
  perform t_ok((select count(*) from auth.users) = users_before, 'X7 no new login account created');
  perform t_ok((v->>'needs_login_email')::boolean, 'X8 phone-only login flagged for login email step');
end $$;

do $$ declare r jsonb; begin
  r := t_issue('1000000008','888888');
  perform t_ok(r->>'error' = 'no_phone' and r->>'challenge' is null, 'X9 malformed school mobile → no code issued');
  perform t_ok((select user_id from guardians where id='00000000-0000-0000-0000-0000000000d8') is null, 'X10 malformed mobile: nothing linked');
end $$;

do $$ declare r jsonb; v jsonb; begin
  r := t_issue('1000000019','999999');
  update id_login_challenges set expires_at = now() - interval '1 minute' where id = (r->>'challenge')::uuid;
  v := _idl_verify((r->>'challenge')::uuid, '999999');
  perform t_ok(v->>'error' = 'expired', 'X11 expired code → expired');
  perform t_ok((select user_id from guardians where id='00000000-0000-0000-0000-0000000000db') is null
           and (select phone_confirmed_at is null from auth.users where id='00000000-0000-0000-0000-000000000019'), 'X12 expired code changes nothing');
end $$;

do $$ declare r jsonb; v jsonb; i int; begin
  perform t_reset_cooldown();
  r := t_issue('1000000002','121212');
  for i in 1..5 loop v := _idl_verify((r->>'challenge')::uuid, '000001'); end loop;
  perform t_ok(v->>'error' = 'locked', 'X13 five wrong codes → locked');
  perform t_ok(_idl_verify((r->>'challenge')::uuid, '121212')->>'error' in ('used','locked'), 'X14 correct code after lock is refused');
end $$;
