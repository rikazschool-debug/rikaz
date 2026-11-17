import { supabase } from "./client";
import { AppContext, MembershipRow, SchoolPerms, SchoolRow } from "./types";
import { buildContexts } from "../lib/contexts";

/** تحميل صفات الشخص من الخادم بالقاعدة نفسها في المنصة. كل البيانات تخضع لسياسات الوصول في الخادم. */
export async function loadContexts(userId: string): Promise<AppContext[]> {
  // قبول الدعوات المعلقة أولًا، كما تفعل المنصة عند كل تحميل
  await supabase.rpc("accept_my_invitations" as never);
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
  if (mems.error) throw mems.error;
  const titleMap: Record<string, string> = {};
  if (!titles.error) {
    for (const t of ((titles.data ?? []) as { membership_id: string; title: string | null }[])) {
      if (t.title) titleMap[t.membership_id] = t.title;
    }
  }
  return buildContexts(
    !!admin.data,
    (mems.data ?? []) as unknown as MembershipRow[],
    (schools.data ?? []) as unknown as SchoolRow[],
    titleMap,
  );
}

/** إبلاغ الخادم بالصفة النشطة؛ يعتمد عليها في إظهار الهويات وعزل البيانات */
export async function setActiveContext(c: AppContext): Promise<void> {
  const { error } = await supabase.rpc("set_active_context" as never, { _role: c.role, _school: c.schoolId } as never);
  if (error) throw error;
}

/** الصلاحيات النهائية في المدرسة: الدور الأساسي + المنح − الاستثناءات، يحسبها الخادم */
export async function fetchSchoolPerms(schoolId: string): Promise<SchoolPerms> {
  const { data, error } = await supabase.rpc("perm_my_school" as never, { _school: schoolId } as never);
  if (error) throw error;
  return (data ?? {}) as SchoolPerms;
}

export async function fetchProfileName(userId: string): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle();
  return (data as { full_name?: string | null } | null)?.full_name ?? null;
}
