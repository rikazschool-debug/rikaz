import type { Role, SchoolPerms } from "../api/types";

/**
 * أقسام الحساب حسب دوره، مطابقة لقائمة منصة ركاز (src/lib/roles.ts NAV_BY_ROLE
 * وsrc/routes/_authenticated/app/route.tsx وsrc/lib/workspace-perms.ts).
 * العرض فقط؛ الخادم يعيد التحقق من الصلاحية عند فتح كل قسم.
 */
export type SectionKey =
  | "academic" | "teachers" | "courses" | "students" | "guardians"
  | "classrooms" | "homework" | "tests" | "schedule" | "attendance" | "station" | "pickup"
  | "admin" | "duties" | "meetings"
  | "communication" | "comm_groups" | "comm_manage" | "circulars" | "notifications" | "hub_notices"
  | "visits" | "family_visits" | "events" | "evaluation" | "collaboration" | "reports"
  | "student_guidance" | "gifted_care" | "remedial_plans" | "supervision" | "health" | "family_requests"
  | "support";

export type SectionGroup = "learning" | "communication" | "care" | "school";

export interface SectionDef {
  label: string;
  path: string;
  icon: string;
  group: SectionGroup;
}

export const SECTION_GROUP_LABEL: Record<SectionGroup, string> = {
  learning: "اليوم الدراسي",
  communication: "التواصل والأخبار",
  care: "المتابعة والرعاية",
  school: "المدرسة والعمل",
};

export const SECTION_GROUP_ORDER: SectionGroup[] = ["learning", "communication", "care", "school"];

export const SECTIONS: Record<SectionKey, SectionDef> = {
  schedule: { label: "جدولي", path: "/app/schedule", icon: "CalendarDays", group: "learning" },
  classrooms: { label: "الفصول الرقمية", path: "/app/classrooms", icon: "School", group: "learning" },
  homework: { label: "مذكرة الواجبات", path: "/app/homework", icon: "ClipboardList", group: "learning" },
  tests: { label: "الاختبارات", path: "/app/tests", icon: "ClipboardCheck", group: "learning" },
  attendance: { label: "الحضور والمواظبة", path: "/app/attendance", icon: "ScanLine", group: "learning" },
  station: { label: "المسح والبوابة والنداء", path: "/app/attendance-station", icon: "ScanLine", group: "learning" },
  pickup: { label: "الخروج والاستئذان", path: "/app/pickup", icon: "DoorOpen", group: "learning" },

  communication: { label: "المحادثات", path: "/app/communication", icon: "MessagesSquare", group: "communication" },
  comm_groups: { label: "المجموعات", path: "/app/communication?tab=groups", icon: "Users", group: "communication" },
  comm_manage: { label: "إدارة المجموعات", path: "/app/communication?tab=manage", icon: "UserCog", group: "communication" },
  circulars: { label: "التعاميم", path: "/app/circulars", icon: "Megaphone", group: "communication" },
  notifications: { label: "الإشعارات", path: "/app/notifications", icon: "Bell", group: "communication" },
  hub_notices: { label: "الإعلانات", path: "/app/hub?tab=notices", icon: "Megaphone", group: "communication" },
  events: { label: "الأنشطة والفعاليات", path: "/app/events", icon: "PartyPopper", group: "communication" },

  family_requests: { label: "طلبات ولي الأمر", path: "/app/family-requests", icon: "ClipboardList", group: "care" },
  family_visits: { label: "الزيارات", path: "/app/family-visits", icon: "CalendarDays", group: "care" },
  evaluation: { label: "نظام التقييم الشامل", path: "/app/evaluation", icon: "Award", group: "care" },
  student_guidance: { label: "التوجيه الطلابي", path: "/app/student-guidance", icon: "HeartHandshake", group: "care" },
  gifted_care: { label: "رعاية الموهوبين", path: "/app/gifted-care", icon: "Sparkles", group: "care" },
  remedial_plans: { label: "الخطط العلاجية", path: "/app/remedial-plans", icon: "BookOpen", group: "care" },
  health: { label: "الصحة المدرسية", path: "/app/health", icon: "HeartPulse", group: "care" },
  visits: { label: "الزيارات الصفية", path: "/app/visits", icon: "ClipboardList", group: "care" },
  supervision: { label: "الإشراف التربوي", path: "/app/supervision", icon: "ClipboardList", group: "care" },

  academic: { label: "الفصول والشعب والهيكل الدراسي", path: "/app/academic", icon: "Network", group: "school" },
  teachers: { label: "الكادر التعليمي", path: "/app/teachers", icon: "UsersRound", group: "school" },
  courses: { label: "المقررات الدراسية وإسنادها", path: "/app/courses", icon: "BookOpen", group: "school" },
  students: { label: "الطلاب", path: "/app/students", icon: "GraduationCap", group: "school" },
  guardians: { label: "أولياء الأمور", path: "/app/guardians", icon: "Users", group: "school" },
  admin: { label: "التكليفات والطلبات", path: "/app/admin", icon: "Briefcase", group: "school" },
  duties: { label: "المناوبات", path: "/app/admin/duties", icon: "ShieldCheck", group: "school" },
  meetings: { label: "الاجتماعات", path: "/app/admin/meetings", icon: "UsersRound", group: "school" },
  collaboration: { label: "المجتمع المهني والمكتبة", path: "/app/collaboration", icon: "UsersRound", group: "school" },
  reports: { label: "منشئ التقارير", path: "/app/reports", icon: "FileBarChart", group: "school" },
  support: { label: "الدعم والمساعدة", path: "/app/support", icon: "LifeBuoy", group: "school" },
};

type MobileRole = Exclude<Role, "platform_admin" | "org_owner">;

const STAFF_ADMIN: SectionKey[] = ["admin", "duties", "meetings"];
const MANAGE: SectionKey[] = ["academic", "teachers", "courses", "students", "guardians", "classrooms", "homework", "schedule", "attendance", ...STAFF_ADMIN, "communication", "notifications"];

/** القائمة الأساسية لكل دور كما في المنصة (دون الرئيسية والأقسام المخفية فيها) */
const BASE: Record<MobileRole, SectionKey[]> = {
  principal: [...MANAGE, "visits", "evaluation", "family_visits", "events", "collaboration", "reports"],
  vice_principal: [...MANAGE.filter((k) => k !== "attendance"), "family_visits", "events", "collaboration", "reports"],
  student_affairs: ["students", "guardians", "schedule", "attendance", ...STAFF_ADMIN, "events", "communication", "notifications", "family_visits", "reports"],
  dept_head: ["teachers", "courses", "classrooms", "homework", "schedule", ...STAFF_ADMIN, "events", "communication", "notifications", "family_visits"],
  supervisor: ["teachers", "courses", "classrooms", "homework", "schedule", "visits", ...STAFF_ADMIN, "events", "communication", "notifications", "family_visits", "collaboration"],
  teacher: ["classrooms", "homework", "schedule", "attendance", ...STAFF_ADMIN, "events", "communication", "notifications", "family_visits", "collaboration"],
  guardian: ["classrooms", "homework", "schedule", "evaluation", "pickup", "communication", "notifications", "family_visits", "events", "family_requests"],
  student: ["classrooms", "homework", "schedule", "pickup", "communication", "notifications", "events"],
  counselor: ["attendance", ...STAFF_ADMIN, "events", "communication", "notifications", "family_visits"],
  nurse: ["health", ...STAFF_ADMIN, "events", "communication", "notifications", "family_visits"],
  security: ["attendance", "station", ...STAFF_ADMIN, "events", "communication", "notifications", "family_visits"],
};

const EXTRA: { key: SectionKey; roles: MobileRole[] }[] = [
  { key: "student_guidance", roles: ["counselor", "teacher"] },
  { key: "gifted_care", roles: ["counselor", "principal", "vice_principal", "teacher", "student_affairs"] },
  { key: "remedial_plans", roles: ["principal", "vice_principal", "teacher", "supervisor", "guardian"] },
  { key: "supervision", roles: ["principal", "supervisor", "teacher", "vice_principal", "dept_head"] },
];

export function isFamilyRole(role: Role): boolean {
  return role === "student" || role === "guardian";
}

const any = (p: SchoolPerms | null | undefined, keys: string[]) => keys.some((k) => p?.[k] === true);
const anyPrefix = (p: SchoolPerms | null | undefined, prefix: string) => !!p && Object.entries(p).some(([k, v]) => k.startsWith(prefix) && v === true);

/** صفحات تفتحها صلاحيات المدرسة الممنوحة (workspacePages في المنصة) */
function delegatedPages(p: SchoolPerms | null | undefined): SectionKey[] {
  const out: SectionKey[] = [];
  const academicParts = ["academic_years", "academic_terms", "academic_stages", "academic_grades", "academic_sections", "academic_departments", "academic_subjects", "academic_scopes"];
  if (academicParts.some((s) => any(p, [`${s}.view`, `${s}.edit`]))) out.push("academic");
  if (any(p, ["course_setup.view", "course_setup.create", "course_setup.edit", "course_assignments.view", "course_assignments.assign", "course_assignments.approve", "course_assignments.cancel"])) out.push("courses");
  if (any(p, ["admin_tasks.view", "admin_tasks.create", "admin_tasks.manage", "admin_requests.view", "admin_requests.submit", "admin_requests.manage", "admin_forms.view", "admin_forms.edit"])) out.push("admin");
  if (any(p, ["school_schedule.view", "schedule_drafts.view", "schedule_drafts.create", "schedule_drafts.edit", "schedule_drafts.generate", "schedule_drafts.publish", "schedule_drafts.revise", "schedule_day.view", "schedule_day.edit", "schedule_rooms.view", "schedule_rooms.edit", "schedule_loads.view", "schedule_loads.edit", "schedule_availability.view", "schedule_availability.edit", "schedule_requirements.view", "schedule_requirements.edit", "schedule_sub_policy.view", "schedule_sub_policy.edit", "bt_schedule.view"])) out.push("schedule");
  if (p?.["bt_classroom.view"]) out.push("classrooms");
  if (p?.["bt_homework.view"]) out.push("homework", "tests");
  for (const s of ["student_guidance", "gifted_care", "remedial_plans"] as const) if (any(p, [`${s}.view`, `${s}.record`, `${s}.manage`])) out.push(s);
  if (p?.["bt_chat_direct.use"] || p?.["bt_chat_groups.use"]) out.push("communication");
  return out;
}

/**
 * أقسام الصفة النشطة. صلاحيات المدرسة تُستخدم للكادر فقط كما في المنصة؛
 * الطالب وولي الأمر تكفيهما قائمة الدور.
 */
export function sectionsFor(role: Role, perms: SchoolPerms | null | undefined): SectionKey[] {
  if (role === "platform_admin" || role === "org_owner") return [];
  const r = role as MobileRole;
  const family = isFamilyRole(r);
  const sp = family ? null : perms;
  let nav: SectionKey[] = [...BASE[r]];
  if (nav.includes("homework")) nav.push("tests");
  for (const e of EXTRA) if (e.roles.includes(r)) nav.push(e.key);

  if (r !== "student") nav.push("circulars");
  if (!family) nav.push("comm_groups");
  if (r === "principal" || r === "vice_principal") nav.push("comm_manage");

  if (!family) {
    if (any(sp, ["gate.operate", "attendance.approve", "attendance.follow", "attendance.view", "attendance.record"])) nav.push("attendance");
    if (sp?.["gate.operate"]) nav.push("station");
    if (any(sp, ["notices.view", "notices.send"])) nav.push("hub_notices");
    if (any(sp, ["health.view", "health.record", "health.manage"])) nav.push("health");
    if (sp?.["groups.create"]) nav.push("comm_manage");
    if (anyPrefix(sp, "ev_")) nav.push("evaluation");
    if (any(sp, ["people_family.view", "people_family.edit"])) nav.push("students", "guardians");
    const delegated = delegatedPages(sp);
    nav.push(...delegated);
    const off: [string, SectionKey][] = [["bt_schedule.view", "schedule"], ["bt_classroom.view", "classrooms"], ["bt_homework.view", "homework"]];
    for (const [k, n] of off) {
      if (sp && sp[k] === false && !(n === "schedule" && delegated.includes("schedule"))) {
        nav = nav.filter((x) => x !== n && !(n === "homework" && x === "tests"));
      }
    }
    // الزيارات الصفية تقع ضمن التقييم لمن يملك صلاحيات التقييم
    if (anyPrefix(sp, "ev_") && nav.includes("evaluation")) nav = nav.filter((x) => x !== "visits");
  }

  nav.push("support");
  return [...new Set(nav)];
}

/** اسم القسم كما يظهر لهذا الدور في المنصة */
export function sectionLabel(key: SectionKey, role: Role): string {
  if (key === "schedule") return role === "principal" || role === "vice_principal" ? "الجدول المدرسي" : "جدولي";
  if (key === "teachers" && role === "principal") return "الكادر التعليمي والإداري";
  return SECTIONS[key].label;
}

export function groupSections(keys: SectionKey[]): { group: SectionGroup; keys: SectionKey[] }[] {
  return SECTION_GROUP_ORDER.map((group) => ({ group, keys: keys.filter((k) => SECTIONS[k].group === group) })).filter((g) => g.keys.length > 0);
}
