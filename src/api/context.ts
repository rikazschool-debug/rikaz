import { supabase } from "./client";
import { AppContext, MembershipRow, SchoolPerms, SchoolRow } from "./types";
import { buildContexts } from "../lib/contexts";
import { CONFIG } from "../config";
import { AuthStageError, authDiagnosticDetails, logAuthDiagnostic } from "../lib/authDiagnostics";

/** تحميل صفات الشخص من الخادم بالقاعدة نفسها في المنصة. كل البيانات تخضع لسياسات الوصول في الخادم. */
export async function loadContexts(userId: string): Promise<AppContext[]> {
  // The acceptance RPC can change invitations and memberships; skip it during an approved read-only test.
  if (CONFIG.readOnlyLoginTest) {
    logAuthDiagnostic("invitation-acceptance", "skipped");
  } else {
    const { error } = await supabase.rpc("accept_my_invitations" as never);
    if (error) logAuthDiagnostic("invitation-acceptance", "failure", authDiagnosticDetails(error));
  }
  const [admin, mems, schools, titles] = await Promise.all([
    supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle(),
    supabase
      .from("memberships")
      .select("id, role, org_id, school_id, department_id, organizations(name), schools(name)")
      .eq("user_id", userId)
      .eq("is_active", true),
    supabase.from("schools").select("id, name, org_id, organizations(name)").order("name"),
    supabase.rpc("my_membership_titles" as never),
  ]);
  if (admin.error) {
    logAuthDiagnostic("context-load", "failure", authDiagnosticDetails(admin.error));
    throw new AuthStageError("context-load", authDiagnosticDetails(admin.error).status);
  }
  if (mems.error) {
    logAuthDiagnostic("memberships", "failure", authDiagnosticDetails(mems.error));
    throw new AuthStageError("memberships", authDiagnosticDetails(mems.error).status);
  }
  if (schools.error) {
    logAuthDiagnostic("school-context", "failure", authDiagnosticDetails(schools.error));
    throw new AuthStageError("school-context", authDiagnosticDetails(schools.error).status);
  }
  if (titles.error) {
    logAuthDiagnostic("membership-titles", "failure", authDiagnosticDetails(titles.error));
    throw new AuthStageError("membership-titles", authDiagnosticDetails(titles.error).status);
  }
  const titleMap: Record<string, string> = {};
  if (!titles.error) {
    for (const t of ((titles.data ?? []) as { membership_id: string; title: string | null }[])) {
      if (t.title) titleMap[t.membership_id] = t.title;
    }
  }
  const contexts = buildContexts(
    !!admin.data,
    (mems.data ?? []) as unknown as MembershipRow[],
    (schools.data ?? []) as unknown as SchoolRow[],
    titleMap,
  );
  logAuthDiagnostic("memberships", "success");
  return contexts;
}

/** إبلاغ الخادم بالصفة النشطة؛ يعتمد عليها في إظهار الهويات وعزل البيانات */
export async function setActiveContext(c: AppContext): Promise<void> {
  const { error } = await supabase.rpc("set_active_context" as never, { _role: c.role, _school: c.schoolId } as never);
  if (error) {
    logAuthDiagnostic("active-context", "failure", authDiagnosticDetails(error));
    throw error;
  }
  logAuthDiagnostic("active-context", "success");
}

/** الصلاحيات النهائية في المدرسة: الدور الأساسي + المنح − الاستثناءات، يحسبها الخادم */
export async function fetchSchoolPerms(schoolId: string): Promise<SchoolPerms> {
  const { data, error } = await supabase.rpc("perm_my_school" as never, { _school: schoolId } as never);
  if (error) {
    logAuthDiagnostic("permissions", "failure", authDiagnosticDetails(error));
    throw error;
  }
  logAuthDiagnostic("permissions", "success");
  return (data ?? {}) as SchoolPerms;
}

export async function fetchProfileName(userId: string): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle();
  return (data as { full_name?: string | null } | null)?.full_name ?? null;
}
