#!/usr/bin/env bash
# Two sessions verify the same activation challenge at once: exactly one activates, the other gets "used".
set -euo pipefail
PSQL="psql -X -q -t -A -v ON_ERROR_STOP=1"
$PSQL -c "insert into auth.users(id, phone) values ('00000000-0000-0000-0000-000000000009','966500000009');
insert into guardians(id, school_id, national_id, phone) values ('00000000-0000-0000-0000-0000000000d9','00000000-0000-0000-0000-0000000000b1','1000000009','0500000009');
insert into memberships(id, user_id, org_id, school_id, role, is_active) values ('00000000-0000-0000-0000-0000000000e9','00000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1','guardian',false);
insert into account_setup(user_id, school_id, kind, subject_id, membership_id, need_phone) values ('00000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-0000000000b1','guardian','00000000-0000-0000-0000-0000000000d9','00000000-0000-0000-0000-0000000000e9',true);" >/dev/null
CH=$($PSQL -c "select _idl_issue('1000000009','123456')->>'challenge'")
( $PSQL -c "begin; select _idl_verify('$CH','123456')->>'activated'; select pg_sleep(2); commit;" > /tmp/idl_a.txt ) &
sleep 0.5
$PSQL -c "select coalesce(_idl_verify('$CH','123456')->>'error','none')" > /tmp/idl_b.txt
wait
A=$(grep -v '^$' /tmp/idl_a.txt | head -1); B=$(cat /tmp/idl_b.txt)
echo "session A: $A  session B: $B"
[ "$A" = "true" ] && [ "$B" = "used" ] && echo "PASS: concurrent verify activates once" || { echo "FAIL: concurrency"; exit 1; }
N=$($PSQL -c "select count(*) from memberships where user_id='00000000-0000-0000-0000-000000000009'")
[ "$N" = "1" ] && echo "PASS: one membership after concurrent verify"
