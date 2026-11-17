import { AppContext, MembershipRow, Role, ROLE_LABELS, SchoolRow } from "../api/types";

/**
 * بناء قائمة الصفات بالقاعدة نفسها في المنصة (loadContexts في src/lib/session.tsx):
 * - أدمن المنصة: صفة المنصة، وصفة مالك المجموعة داخل كل مدرسة.
 * - مالك المجموعة: صفة لكل مدرسة في مؤسسته (أو صفة واحدة إن لم تكن فيها مدارس).
 * - بقية الأدوار: صفة لكل عضوية نشطة.
 */
export function buildContexts(
  isPlatformAdmin: boolean,
  memberships: MembershipRow[],
  schools: SchoolRow[],
  titles: Record<string, string> = {},
): AppContext[] {
  const out: AppContext[] = [];
  if (isPlatformAdmin) {
    out.push({ key: "admin", role: "platform_admin", orgId: null, orgName: "المنصة", schoolId: null, schoolName: "كل المؤسسات", departmentId: null });
    for (const s of schools) {
      out.push({ key: `admin:${s.id}`, role: "org_owner", orgId: s.org_id, orgName: s.organizations?.name ?? "", schoolId: s.id, schoolName: s.name, departmentId: null });
    }
  }
  for (const m of memberships) {
    if (!(m.role in ROLE_LABELS)) continue;
    const role = m.role as Role;
    if (role === "org_owner") {
      const own = schools.filter((s) => s.org_id === m.org_id);
      if (own.length === 0) {
        out.push({ key: m.id, role, orgId: m.org_id, orgName: m.organizations?.name ?? "", schoolId: null, schoolName: "بلا مدارس", departmentId: null });
      }
      for (const s of own) {
        out.push({ key: `${m.id}:${s.id}`, role, orgId: m.org_id, orgName: m.organizations?.name ?? "", schoolId: s.id, schoolName: s.name, departmentId: null });
      }
    } else {
      out.push({
        key: m.id,
        role,
        orgId: m.org_id,
        orgName: m.organizations?.name ?? "",
        schoolId: m.school_id,
        schoolName: m.schools?.name ?? (m.school_id ? "" : "الإدارة المركزية"),
        departmentId: m.department_id,
        title: titles[m.id],
      });
    }
  }
  return out;
}

/** هل يحتاج الشخص إلى اختيار صفته؟ مثل المنصة: عند وجود أكثر من دور مختلف */
export function needsChooser(contexts: AppContext[]): boolean {
  return new Set(contexts.map((c) => c.role)).size > 1;
}

/** الصفة الافتراضية عند عدم وجود اختيار محفوظ صالح، بترتيب المنصة */
export function fallbackContext(contexts: AppContext[]): AppContext | null {
  return contexts.find((c) => c.key === "admin") ?? contexts.find((c) => c.schoolId) ?? contexts[0] ?? null;
}

/**
 * الصفة النشطة عند فتح التطبيق أو تحديث الصفات:
 * المحفوظة إن بقيت صالحة، وإلا يُطلب الاختيار لمن لديه أكثر من دور، وإلا الافتراضية.
 */
export function resolveActive(contexts: AppContext[], savedKey: string | null): { active: AppContext | null; mustChoose: boolean } {
  const saved = savedKey ? contexts.find((c) => c.key === savedKey) : undefined;
  if (saved) return { active: saved, mustChoose: false };
  if (needsChooser(contexts)) return { active: null, mustChoose: true };
  return { active: fallbackContext(contexts), mustChoose: false };
}

/** بصمة الصفات لاكتشاف أي تغيير في الأدوار أو المدارس من الخادم */
export function contextsSignature(contexts: AppContext[]): string {
  return contexts.map((c) => `${c.key}|${c.role}|${c.schoolId}|${c.departmentId}`).sort().join(";");
}

export type AccountKind = "staff" | "guardian" | "student";
export function accountKind(role: Role): AccountKind {
  return role === "guardian" ? "guardian" : role === "student" ? "student" : "staff";
}
export const ACCOUNT_KIND_LABEL: Record<AccountKind, string> = {
  staff: "حساب الموظف",
  guardian: "حساب الأسرة",
  student: "حساب الطالب",
};

export function contextLabel(c: AppContext): string {
  return c.title ?? ROLE_LABELS[c.role];
}
