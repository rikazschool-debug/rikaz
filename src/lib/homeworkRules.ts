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
