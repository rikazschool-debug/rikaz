export type Role =
  | "platform_admin"
  | "org_owner"
  | "principal"
  | "vice_principal"
  | "dept_head"
  | "supervisor"
  | "student_affairs"
  | "teacher"
  | "guardian"
  | "student"
  | "counselor"
  | "nurse"
  | "security";

/** مطابقة لـ ROLE_LABELS في المنصة (src/lib/roles.ts) */
export const ROLE_LABELS: Record<Role, string> = {
  platform_admin: "أدمن المنصة",
  org_owner: "مالك المجموعة",
  principal: "مدير المدرسة",
  vice_principal: "الوكيل",
  dept_head: "رئيس القسم",
  supervisor: "المشرف التربوي",
  student_affairs: "شؤون الطلاب والقبول",
  teacher: "المعلم",
  guardian: "ولي الأمر",
  student: "الطالب",
  counselor: "المرشد الطلابي",
  nurse: "التوجيه الصحي",
  security: "الأمن والاستقبال",
};

export type Portal = "student" | "guardian" | "staff";

/** صفة واحدة يدخل بها الشخص: دور في مدرسة (أو في المؤسسة/المنصة). مطابقة لـ AppContext في المنصة. */
export interface AppContext {
  key: string;
  role: Role;
  orgId: string | null;
  orgName: string;
  schoolId: string | null;
  schoolName: string;
  departmentId: string | null;
  /** مسمى الصفة من قالب الصلاحيات إن وُجد (my_membership_titles) */
  title?: string;
}

/** صلاحيات الشخص النهائية في المدرسة النشطة كما يحسبها الخادم (perm_my_school) */
export type SchoolPerms = Record<string, boolean>;

export interface MembershipRow {
  id: string;
  role: string;
  org_id: string | null;
  school_id: string | null;
  department_id: string | null;
  organizations?: { name?: string | null } | null;
  schools?: { name?: string | null } | null;
}

export interface SchoolRow {
  id: string;
  name: string;
  org_id: string | null;
  organizations?: { name?: string | null } | null;
}
