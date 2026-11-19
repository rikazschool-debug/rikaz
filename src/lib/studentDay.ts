/** حسابات يوم الطالب (بلا React): حالة كل حصة، الاستراحات، والحصة الحالية أو القادمة بتوقيت الرياض. */
import type { HomeworkRow, Slot } from "./studentData";

/** "07:15:00" → 435 دقيقة؛ القيمة الفارغة أو غير الصالحة → null */
export function toMinutes(t: string | null | undefined): number | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** الدقائق منذ منتصف الليل بتوقيت الرياض (UTC+3 دون توقيت صيفي). */
export function riyadhMinutes(d: Date = new Date()): number {
  const r = new Date(d.getTime() + 3 * 3600_000);
  return r.getUTCHours() * 60 + r.getUTCMinutes();
}

export type LessonState = "done" | "now" | "next" | "none";
export type DayItem =
  | { kind: "lesson"; slot: Slot; state: LessonState; progress: number; minutesLeft: number | null }
  | { kind: "break"; start: string; end: string; minutes: number };

/** أقصر فجوة بين حصتين تُعرض كاستراحة (تبديل الحصص القصير لا يُعد استراحة). */
export const BREAK_MIN = 15;

function stateOf(s: Slot, now: number | null): { state: LessonState; progress: number; minutesLeft: number | null } {
  const a = toMinutes(s.start);
  const b = toMinutes(s.end);
  if (now === null || a === null || b === null || b <= a) return { state: "none", progress: 0, minutesLeft: null };
  if (now >= b) return { state: "done", progress: 1, minutesLeft: 0 };
  if (now >= a) return { state: "now", progress: (now - a) / (b - a), minutesLeft: b - now };
  return { state: "next", progress: 0, minutesLeft: null };
}

/**
 * حصص اليوم مرتبة مع الاستراحات بينها. now = دقائق الرياض لليوم الحالي، أو null ليوم آخر
 * (فلا تُعرض حالة «انتهت/الآن/قادمة» لأيام لم تأتِ أو مضت).
 */
export function planDay(slots: Slot[], now: number | null): DayItem[] {
  const rows = [...slots].sort((x, y) => x.sort - y.sort);
  const out: DayItem[] = [];
  rows.forEach((s, i) => {
    out.push({ kind: "lesson", slot: s, ...stateOf(s, now) });
    const n = rows[i + 1];
    const end = toMinutes(s.end);
    const nextStart = toMinutes(n?.start);
    if (n && end !== null && nextStart !== null && nextStart - end >= BREAK_MIN) {
      out.push({ kind: "break", start: s.end as string, end: n.start as string, minutes: nextStart - end });
    }
  });
  return out;
}

export type DaySummary = { total: number; done: number; remaining: number };
export function summarize(slots: Slot[], now: number | null): DaySummary {
  const done = now === null ? 0 : slots.filter((s) => stateOf(s, now).state === "done").length;
  return { total: slots.length, done, remaining: slots.length - done };
}

/** الحصة الجارية، أو أقرب حصة قادمة مع الدقائق المتبقية لبدايتها؛ null إن انتهى اليوم. */
export function currentOrNext(slots: Slot[], now: number): { slot: Slot; live: boolean; startsIn: number } | null {
  const rows = [...slots].sort((x, y) => x.sort - y.sort);
  for (const s of rows) {
    const st = stateOf(s, now);
    if (st.state === "now") return { slot: s, live: true, startsIn: 0 };
    if (st.state === "next") return { slot: s, live: false, startsIn: (toMinutes(s.start) as number) - now };
  }
  return null;
}

/** تاريخ YYYY-MM-DD لتوقيت الرياض. */
const riyadhDate = (ms: number) => new Date(ms + 3 * 3600_000).toISOString().slice(0, 10);

/** فرق الأيام بين موعد التسليم واليوم بتوقيت الرياض (0 اليوم، 1 غدًا، سالب = مضى). */
export function dueInDays(due: string, now: number): number {
  const a = Date.parse(riyadhDate(now) + "T00:00:00Z");
  const b = Date.parse(riyadhDate(new Date(due).getTime()) + "T00:00:00Z");
  return Math.round((b - a) / 86400_000);
}

export function dueLabel(due: string, now: number): { label: string; tone: "accent" | "muted" | "danger" } {
  const d = dueInDays(due, now);
  if (new Date(due).getTime() < now) return { label: "فات موعده", tone: "danger" };
  if (d <= 0) return { label: "اليوم", tone: "accent" };
  if (d === 1) return { label: "غدًا", tone: "accent" };
  if (d === 2) return { label: "بعد يومين", tone: "muted" };
  return { label: d <= 10 ? `بعد ${d} أيام` : `بعد ${d} يومًا`, tone: "muted" };
}

/** واجبات واختبارات لم تُسلّم بعد، الأقرب موعدًا أولًا. */
export function upcomingWork(rows: HomeworkRow[], now: number, withinDays?: number): HomeworkRow[] {
  return rows
    .filter((r) => ["none", "draft"].includes(r.sub_status) && !r.removed && r.status !== "archived" && new Date(r.effective_due).getTime() >= now)
    .filter((r) => withinDays === undefined || dueInDays(r.effective_due, now) <= withinDays)
    .sort((a, b) => a.effective_due.localeCompare(b.effective_due));
}

/** وقت مختصر لقوائم المحادثات بتوقيت الرياض: اليوم ← الساعة، أمس ← «أمس»، الأسبوع ← اسم اليوم، وإلا التاريخ. */
export function shortWhen(at: string, now: number = Date.now()): string {
  const t = new Date(at).getTime();
  const d = -dueInDays(at, now);
  const opt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { timeZone: "Asia/Riyadh", ...o }).format(new Date(t));
  try {
    if (d <= 0) return opt({ hour: "numeric", minute: "2-digit" });
    if (d === 1) return "أمس";
    if (d < 7) return opt({ weekday: "long" });
    return opt({ day: "numeric", month: "numeric" });
  } catch {
    return at.slice(0, 10);
  }
}

/** عدد الخدمات بصيغة عربية صحيحة. */
export function servicesLabel(n: number): string {
  if (n === 1) return "خدمة واحدة";
  if (n === 2) return "خدمتان";
  return n <= 10 ? `${n} خدمات` : `${n} خدمة`;
}

