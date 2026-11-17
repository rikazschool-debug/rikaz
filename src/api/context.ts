import { supabase } from "./client";
import { MembershipItem, Role, ROLE_LABELS, SchoolPerms } from "./types";

// Fetch user active memberships and school names
export async function fetchUserMemberships(userId: string): Promise<MembershipItem[]> {
  const { data, error } = await supabase
    .from("memberships")
    .select("id, org_id, school_id, role, is_active, branch_suspended, schools(id, name)")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) throw error;

  return (data || []).map((m: any) => ({
    id: m.id,
    org_id: m.org_id,
    school_id: m.school_id,
    school_name: m.schools?.name || "المؤسسة الرئيسية",
    role: m.role as Role,
    is_active: m.is_active,
    branch_suspended: m.branch_suspended,
  }));
}

// Set active school and role context on backend
export async function setActiveContext(schoolId: string, role: Role): Promise<void> {
  const { error } = await supabase.rpc("set_active_context" as never, {
    _school: schoolId,
    _role: role,
  } as never);
  if (error) {
    console.warn("set_active_context notice:", error.message);
  }
}

// Fetch exact flexible permissions for the active school branch
export async function fetchSchoolPerms(schoolId: string): Promise<SchoolPerms> {
  const { data, error } = await supabase.rpc("perm_my_school" as never, {
    _school: schoolId,
  } as never);

  if (error) {
    console.warn("fetchSchoolPerms error:", error.message);
    return {};
  }
  return (data || {}) as SchoolPerms;
}
