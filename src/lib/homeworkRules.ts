/** قواعد التسليم والتصحيح منقولة من صفحة الواجب في المنصة (بلا React). الخادم يبقى الحَكَم. */
export type Att = { id: string; attempt_no: number; kind?: string | null; submitted_at: string; is_late?: boolean | null; body?: string | null; link_url?: string | null; note?: string | null };
export type Grade = { id: string; status: string; score?: number | null; feedback?: string | null; attempt_no?: number | null; needs_review?: boolean | null; published_at?: string | null; exam_reviewed_at?: string | null; exam_approved_at?: string | null; rev?: number | null; criteria_scores?: number[] | null };
export type Sub = { id: string; status: string; attempt_count?: number | null; returned_reason?: string | null };
export type TargetRow = { student_id: string; name: string; removed_at?: string | null; join_status?: string | null; sub: Sub | null; atts: Att[]; grade: Grade | null };

export const GRADE_STATUS: Record<string, string> = { none: "لم يُصحح", in_progress: "قيد التصحيح", graded: "مصحح", published: "منشور" };
export type GradeFilter = "all" | "missing" | "late" | "returned" | "to_grade" | "to_publish";

export const submitted = (r: TargetRow) => (r.sub?.attempt_count ?? 0) > 0;
export const needsGrade = (r: TargetRow) =>
  submitted(r) && r.sub!.status !== "returned" && (!r.grade || r.grade.status === "in_progress" || !!r.grade.needs_review);
export const readyToPublish = (r: TargetRow, isTest: boolean) =>
  r.grade?.status === "graded" && !r.grade.needs_review && (!isTest || !!r.grade.exam_approved_at);

export function filterRows(rows: TargetRow[], f: GradeFilter, isTest: boolean): TargetRow[] {
  const live = rows.filter((r) => !["pending", "declined"].includes(r.join_status ?? ""));
  const fn: Record<GradeFilter, (r: TargetRow) => boolean> = {
    all: () => true,
    missing: (r) => !submitted(r) && !r.removed_at,
    late: (r) => r.atts.some((a) => !!a.is_late),
    returned: (r) => r.sub?.status === "returned",
    to_grade: needsGrade,
    to_publish: (r) => readyToPublish(r, isTest),
  };
  return live.filter(fn[f]);
}

/** الدرجة رقم بين 0 والحد الأعلى؛ غير ذلك يُرفض قبل الإرسال. */
export function scoreError(v: string, max: number): string | null {
  if (!v.trim()) return "أدخل الدرجة";
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > max) return `الدرجة بين 0 و${max}`;
  return null;
}
export const criteriaTotal = (vals: string[]) => vals.reduce((s, x) => s + (Number(x) || 0), 0);

/** الروابط تُفتح فقط إن كانت http/https. */
export function safeLink(u?: string | null): string | null {
  if (!u) return null;
  try { const p = new URL(u.trim()); return p.protocol === "https:" || p.protocol === "http:" ? p.toString() : null; } catch { return null; }
}
export const submitLabel = (attempts: number) => (attempts > 0 ? "إعادة التسليم" : "تسليم الواجب");

/** إجابات الاختبار بنفس ترتيب الأسئلة: الاختيارية مصفوفة أرقام، والبقية نص؛ غير المجاب يُرسل فارغًا. */
export const CHOICE_TYPES = ["single", "multiple", "truefalse"];
export function examAnswers(qs: { type: string }[], a: Record<number, number[] | string>): (number[] | string)[] {
  return qs.map((q, i) => a[i] ?? (CHOICE_TYPES.includes(q.type) ? [] : ""));
}
export function toggleChoice(type: string, old: number[] | string | undefined, j: number): number[] {
  const cur = Array.isArray(old) ? old : [];
  if (type !== "multiple") return [j];
  return cur.includes(j) ? cur.filter((n) => n !== j) : [...cur, j];
}
export const unanswered = (qs: { type: string }[], a: Record<number, number[] | string>) =>
  examAnswers(qs, a).filter((x) => (Array.isArray(x) ? !x.length : !x.trim())).length;

/* ---------- إنشاء واجب (نفس حمولة save_homework في المنصة) ---------- */
export type HwForm = {
  course_id: string; title: string; instructions: string; types: string[]; from: { d: string; t: string } | null; due: { d: string; t: string } | null;
  late_policy: "none" | "allow" | "until"; late_until: { d: string; t: string } | null; graded: boolean; max_score: string; allow_resubmit: boolean; max_attempts: string;
  audience?: "all" | "selected"; students?: string[]; criteria?: { label: string; max: string }[];
};
/** وقت المدرسة (الرياض +03:00) إلى ISO؛ بلا اختيار = null. */
export const riyadhIso = (v: { d: string; t: string } | null) => (v ? new Date(`${v.d}T${v.t}:00+03:00`).toISOString() : null);
export function nextDays(today: string, n: number): string[] {
  const base = Date.parse(today + "T00:00:00Z");
  return Array.from({ length: n }, (_, i) => new Date(base + i * 864e5).toISOString().slice(0, 10));
}
export function hwFormError(f: HwForm, now = Date.now()): string | null {
  if (!f.course_id) return "اختر المقرر";
  if (!f.title.trim()) return "اكتب عنوان الواجب";
  if (!f.types.length) return "اختر طريقة تسليم واحدة على الأقل";
  if (!f.due) return "حدد موعد التسليم";
  const due = Date.parse(riyadhIso(f.due)!);
  if (due <= now) return "موعد التسليم يجب أن يكون في المستقبل";
  if (f.from && Date.parse(riyadhIso(f.from)!) >= due) return "وقت الإتاحة يجب أن يسبق موعد التسليم";
  if (f.late_policy === "until" && (!f.late_until || Date.parse(riyadhIso(f.late_until)!) <= due)) return "الموعد النهائي للتأخر يجب أن يكون بعد موعد التسليم";
  if (f.graded && !(Number(f.max_score) > 0)) return "الدرجة الكاملة يجب أن تكون أكبر من صفر";
  if (f.allow_resubmit && !(Number.isInteger(Number(f.max_attempts)) && Number(f.max_attempts) >= 2)) return "عدد المحاولات 2 أو أكثر";
  if (f.audience === "selected" && !f.students?.length) return "اختر طالبًا واحدًا على الأقل";
  const crit = usedCriteria(f);
  if (crit.some((c) => !(Number(c.max) > 0))) return "درجة كل معيار يجب أن تكون أكبر من صفر";
  if (crit.length && criteriaTotal(crit.map((c) => c.max)) !== Number(f.max_score)) return "مجموع درجات المعايير يجب أن يساوي الدرجة الكاملة";
  return null;
}
/** المعايير المعبّأة فقط، وتُهمل إن كان الواجب بلا درجة. */
export const usedCriteria = (f: HwForm) => (f.graded ? (f.criteria ?? []).filter((c) => c.label.trim()) : []);
export function hwPayload(f: HwForm) {
  return {
    course_id: f.course_id, title: f.title.trim(), instructions: f.instructions, grading_notes: "", submission_types: f.types,
    available_from: riyadhIso(f.from), due_at: riyadhIso(f.due), late_policy: f.late_policy, late_until: f.late_policy === "until" ? riyadhIso(f.late_until) : null,
    max_score: f.graded ? f.max_score : null, criteria: usedCriteria(f).map((c) => ({ label: c.label.trim(), max: Number(c.max) })),
    allow_resubmit: f.allow_resubmit, max_attempts: f.allow_resubmit ? Number(f.max_attempts) : 1,
    audience: f.audience ?? "all", students: f.audience === "selected" ? f.students ?? [] : [], remind_hours: null, file_max_bytes: null,
  };
}
