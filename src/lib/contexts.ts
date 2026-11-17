import { AppContext, MembershipRow, Role, ROLE_LABELS, SchoolRow } from "../api/types";

/**
 * يعرض الجوال العضويات المسموحة فقط، دون تصنيع صفات من صلاحية مالك المنصة.
 * تبقى صلاحيات المنصة وسياسات الخادم المصدر النهائي للتحقق من الوصول.
 */
export function buildContexts(
  _isPlatformAdmin: boolean,
  memberships: MembershipRow[],
  _schools: SchoolRow[],
  titles: Record<string, string> = {},
): AppContext[] {
  const out: AppContext[] = [];
  for (const m of memberships) {
    if (!isMobileRole(m.role)) continue;
    const role = m.role as Role;
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
  return out;
}

export function isMobileRole(role: string): boolean {
  return Object.prototype.hasOwnProperty.call(ROLE_LABELS, role) && role !== "platform_admin" && role !== "org_owner";
}

/** هل يحتاج الشخص إلى اختيار صفته؟ مثل المنصة: عند وجود أكثر من دور مختلف */
export function needsChooser(contexts: AppContext[]): boolean {
  return new Set(contexts.map((c) => c.role)).size > 1;
}

/** الصفة الافتراضية عند عدم وجود اختيار محفوظ صالح، بترتيب المنصة */
export function fallbackContext(contexts: AppContext[]): AppContext | null {
  return contexts.find((c) => c.schoolId) ?? contexts[0] ?? null;
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
  staff: "الكادر التعليمي",
  guardian: "ولي الأمر",
  student: "حساب الطالب",
};

export function contextLabel(c: AppContext): string {
  return c.title ?? ROLE_LABELS[c.role];
}
