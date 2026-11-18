/** قواعد عرض أقسام المعلم، منقولة من صفحات منصة ركاز (attendance/lessons، schedule، admin، education). */

export type MarkStatus = "present" | "absent" | "late" | "excused";
export const MARK_ORDER: MarkStatus[] = ["present", "absent", "late", "excused"];
export const MARK_LABEL: Record<MarkStatus, string> = { present: "حاضر", absent: "غائب", late: "متأخر", excused: "بعذر" };
export const LESSON_STATUS: Record<string, string> = { approved: "معتمد", draft: "مسودة", none: "لم يُرصد" };

/** الحالة التالية عند لمس اسم الطالب (حاضر ← غائب ← متأخر ← بعذر ← حاضر). */
export function nextMark(s: MarkStatus): MarkStatus {
  return MARK_ORDER[(MARK_ORDER.indexOf(s) + 1) % MARK_ORDER.length]!;
}

export function countMarks(marks: Record<string, MarkStatus>): Record<MarkStatus, number> {
  const c: Record<MarkStatus, number> = { present: 0, absent: 0, late: 0, excused: 0 };
  for (const v of Object.values(marks)) c[v] += 1;
  return c;
}

/** ما تغيّر فقط يُرسل إلى la_save كما تفعل المنصة. */
export function changedMarks(original: { student_id: string; status: MarkStatus }[], marks: Record<string, MarkStatus>) {
  return original.filter((m) => marks[m.student_id] && marks[m.student_id] !== m.status).map((m) => ({ student_id: m.student_id, status: marks[m.student_id]! }));
}

export type TeacherSlot = { id: string; day: number; period: string; sort: number; start: string | null; end: string | null; subject: string; section: string; room: string };

/** حصص المعلم مرتبة حسب اليوم ثم ترتيب الحصة. */
export function slotsByDay(slots: TeacherSlot[]): Map<number, TeacherSlot[]> {
  const m = new Map<number, TeacherSlot[]>();
  for (const s of [...slots].sort((a, b) => a.day - b.day || a.sort - b.sort)) m.set(s.day, [...(m.get(s.day) ?? []), s]);
  return m;
}

export const TASK_STATUS: Record<string, string> = { new: "جديد", in_progress: "قيد التنفيذ", awaiting_confirmation: "بانتظار التأكيد", done: "منجز", returned: "معاد للاستكمال", cancelled: "ملغى" };
export const PRIORITY: Record<string, string> = { low: "منخفضة", normal: "عادية", high: "عالية", urgent: "عاجلة" };
export const DUTY_STATUS: Record<string, string> = { assigned: "مسندة", replaced: "استُبدلت ببديل", cancelled: "ملغاة" };
export const EXEC_STATUS: Record<string, string> = { pending: "لم يوثق التنفيذ", done: "نُفذت", not_done: "تعذر التنفيذ" };
export const MEETING_STATUS: Record<string, string> = { draft: "مسودة", scheduled: "مجدول", cancelled: "ملغى", held: "منعقد" };
export const HW_STATUS: Record<string, string> = { draft: "مسودة", published: "منشور", closed: "مغلق", archived: "مؤرشف" };

export type EduKind = "referral" | "talent" | "student_plan" | "supervision";
export const EDU_TITLE: Record<EduKind, string> = { referral: "التوجيه الطلابي", talent: "رعاية الموهوبين", student_plan: "الخطط العلاجية", supervision: "الإشراف التربوي" };
export const EDU_STATUS: Record<string, string> = { open: "مفتوح", following: "قيد المتابعة", completed: "مكتمل", closed: "مغلق" };

/** نتيجة تقييم المعلم كما في المنصة: «لا أستطيع التقييم» لا تُحسب صفرًا. */
export function evalScore(codes: string[], answers: Record<string, number | "na">): { answered: number; total: number; avg: number | null } {
  const vals = codes.map((c) => answers[c]).filter((v) => v !== undefined);
  const nums = vals.filter((v): v is number => typeof v === "number");
  return { answered: vals.length, total: codes.length, avg: nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : null };
}

/** المناوبة: الإقرار متاح ما لم يُقر، والتوثيق في يومها أو بعده وهي قيد الانتظار. */
export function dutyActions(d: { status: string; ack_at: string | null; exec_status: string; date: string }, today: string) {
  const live = d.status === "assigned";
  return { ack: live && !d.ack_at, exec: live && d.date <= today && d.exec_status === "pending" };
}
