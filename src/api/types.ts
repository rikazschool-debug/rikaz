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

export interface MembershipItem {
  id: string;
  org_id: string;
  school_id: string | null;
  school_name?: string;
  role: Role;
  is_active: boolean;
  branch_suspended?: boolean;
}

export type SchoolPerms = Record<string, boolean>;

export interface ActiveContext {
  orgId: string;
  schoolId: string;
  schoolName: string;
  role: Role;
  roleLabel: string;
  permissions: SchoolPerms;
}

export interface UserProfile {
  id: string;
  email?: string;
  fullName?: string;
  nationalId?: string;
}
