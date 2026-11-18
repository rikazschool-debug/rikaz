-- Minimal stand-in for the platform schema (only columns the sign-in functions touch). Fake data only.
do $$ begin create role anon; create role authenticated; create role service_role; exception when duplicate_object then null; end $$;
create extension if not exists pgcrypto schema public;
create schema if not exists extensions;
create or replace function extensions.digest(text, text) returns bytea language sql immutable as $$ select public.digest($1, $2) $$;
create schema if not exists auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, phone text unique, phone_confirmed_at timestamptz);
create type public.app_role as enum ('guardian','student','teacher','admin','org_owner');
create table public.organizations (id uuid primary key default gen_random_uuid());
create table public.schools (id uuid primary key default gen_random_uuid(), org_id uuid references public.organizations(id));
create table public.guardians (id uuid primary key default gen_random_uuid(), school_id uuid references public.schools(id), user_id uuid, national_id text, phone text, full_name text);
create table public.students (id uuid primary key default gen_random_uuid(), school_id uuid, full_name text);
create table public.student_guardians (student_id uuid, guardian_id uuid, primary key (student_id, guardian_id));
create table public.teachers (id uuid primary key default gen_random_uuid(), school_id uuid, user_id uuid, national_id text, phone text);
create table public.hr_employees (id uuid primary key default gen_random_uuid(), user_id uuid, national_id text, phone text, status text);
create table public.org_owner_identity (user_id uuid primary key, national_id text, phone text);
create table public.memberships (id uuid primary key default gen_random_uuid(), user_id uuid, org_id uuid, school_id uuid, role public.app_role, is_active boolean, branch_suspended boolean not null default false);
create table public.access_audit (id bigserial primary key, org_id uuid, school_id uuid, actor uuid, action text, target_user uuid, target_membership uuid, after jsonb, reason text, created_at timestamptz default now());
create table public.account_setup (
  user_id uuid primary key references auth.users(id), school_id uuid not null, kind text not null, subject_id uuid not null, membership_id uuid,
  need_password boolean not null default false, need_phone boolean not null default false, restore_active boolean not null default true,
  restore_ids uuid[], created_by uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), completed_at timestamptz);
create table public.id_login_challenges (
  id uuid primary key default gen_random_uuid(), nid_hash text not null, user_id uuid not null, phone text not null, code_hash text not null,
  channel text not null default 'whatsapp', send_status text not null default 'pending', attempts int not null default 0,
  expires_at timestamptz not null, used_at timestamptz, created_at timestamptz not null default now());
