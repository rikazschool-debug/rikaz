/** قواعد عرض بيانات الطالب، منقولة من المنصة كما هي (بلا React) لتبقى الأرقام والتسميات متطابقة. */

export type Slot = { day: number; period: string; sort: number; start: string | null; end: string | null; subject: string; teacher: string | null };
export type AttRow = { date: string; status: string; note: string | null };
export type HomeworkRow = {
  id: string; title: string; subject: string; kind?: string | null; status?: string | null;
  sub_status: string; due_at: string; effective_due: string; removed?: boolean | null; last_late?: boolean | null;
};
export type ResultItem = { name: string; status: string; score?: number | null; max?: number | null };
export type ResultRow = {
  id: string; student_id: string; subject_name: string; period_name: string; section_name: string | null;
  items: ResultItem[]; total: number | null; max_total: number | null; version: number; published_at: string; note: string | null; change_note: string | null;
};

export const ATT_STATUSES = ["present", "late", "excused", "absent", "in_school_absent", "pending_review"] as const;
export const ATT_LABEL: Record<string, string> = {
  present: "حاضر", late: "متأخر", excused: "غائب بعذر", absent: "غائب",
  in_school_absent: "دخل المدرسة ولم يحضر الفصل", pending_review: "بانتظار تحقق المدرسة",
};
export const SUB_STATUS: Record<string, string> = {
  none: "لم يسلّم", draft: "مسودة (لم ترسل)", submitted: "مسلّم", returned: "أعيد للاستكمال", resubmitted: "أعيد تسليمه", paper: "تسليم ورقي موثق",
};
export const ENTRY_STATUS: Record<string, string> = { missing: "لم تُرصد", score: "درجة", absent: "غائب", exempt: "معفى" };
export const DAY_NAMES = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
export const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

export const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
/** الجمعة والسبت عطلة؛ اليوم غير المرصود يبقى «لم يُرصد» ولا يُحسب غيابًا. */
export const isWeekend = (d: string) => { const w = new Date(d + "T00:00:00Z").getUTCDay(); return w === 5 || w === 6; };
export function monthRange(y: number, m: number) {
  return { from: iso(y, m, 1), to: iso(y, m, new Date(Date.UTC(y, m + 1, 0)).getUTCDate()) };
}
export function monthGrid(y: number, m: number): (string | null)[] {
  const first = new Date(Date.UTC(y, m, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => iso(y, m, i + 1))];
}
export function countBy(rows: AttRow[]) {
  const c: Record<string, number> = {};
  for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
  return c;
}
export function shiftMonth(y: number, m: number, by: number) {
  const n = m + by;
  return { y: y + Math.floor(n / 12), m: ((n % 12) + 12) % 12 };
}

export const hm = (t: string | null) => (t ? t.slice(0, 5) : "");
/** حصص يوم واحد (0 = الأحد) مرتبة بالحصة. */
export function lessonsOn(rows: Slot[], day: number): Slot[] {
  return rows.filter((r) => r.day === day).sort((a, b) => a.sort - b.sort);
}
/** أيام الجدول الفعلية مرتبة. */
export function scheduleDays(rows: Slot[]): number[] {
  return [...new Set(rows.map((r) => r.day))].sort((a, b) => a - b);
}

export type HwGroup = "due" | "late" | "returned" | "done" | "all";
export const HW_GROUP_LABEL: Record<HwGroup, string> = { due: "المطلوب", late: "فات موعده", returned: "معاد", done: "المسلّم", all: "الكل" };
const pending = (r: HomeworkRow) => ["none", "draft"].includes(r.sub_status) && !r.removed && r.status !== "archived";
/** نفس تقسيم المنصة: المطلوب/المتأخر حسب الموعد الفعلي (بعد التمديد). */
export function groupHomework(rows: HomeworkRow[], now: number): Record<HwGroup, HomeworkRow[]> {
  return {
    due: rows.filter((r) => pending(r) && new Date(r.effective_due).getTime() >= now),
    late: rows.filter((r) => pending(r) && new Date(r.effective_due).getTime() < now),
    returned: rows.filter((r) => r.sub_status === "returned"),
    done: rows.filter((r) => ["submitted", "resubmitted", "paper"].includes(r.sub_status)),
    all: rows,
  };
}
export const byKind = (rows: HomeworkRow[], kind: "homework" | "test") => rows.filter((r) => (r.kind ?? "homework") === kind);

export function itemValue(i: ResultItem): string {
  return i.status === "score" ? `${i.score} / ${i.max}` : ENTRY_STATUS[i.status] ?? i.status;
}

const fmt = (() => {
  try {
    return new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { timeZone: "Asia/Riyadh", dateStyle: "medium", timeStyle: "short" });
  } catch {
    return null;
  }
})();
/** وقت المدرسة (الرياض) لا ساعة الجهاز. */
export function schoolTime(v: string | null | undefined): string {
  if (!v) return "—";
  return fmt ? fmt.format(new Date(v)) : v;
}
export function schoolDate(v: string): string {
  try {
    return new Date(v).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", { timeZone: "Asia/Riyadh" });
  } catch {
    return v.slice(0, 10);
  }
}
/** يوم الأسبوع في الرياض (0 = الأحد). */
export function riyadhWeekday(d: Date): number {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Riyadh", weekday: "short" }).format(d);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
}

/** تاريخ اليوم YYYY-MM-DD بتوقيت الرياض، و«قبل n يوم». */
export function riyadhToday(d: Date = new Date()): string {
  return new Date(d.getTime() + 3 * 3600_000).toISOString().slice(0, 10);
}
export function daysAgo(n: number, d: Date = new Date()): string {
  return riyadhToday(new Date(d.getTime() - n * 86400_000));
}
