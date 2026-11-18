/** قواعد إعداد الاختبار منقولة من نموذج الاختبار في المنصة (exam-model). الخادم يبقى الحَكَم. */
import { riyadhIso } from "./homeworkRules";

export const QUESTION_TYPES: Record<string, string> = {
  single: "اختيار من متعدد", multiple: "اختيارات متعددة", truefalse: "صح أو خطأ", short: "إجابة قصيرة", essay: "مقالي",
  fill: "إكمال الفراغ", match: "توصيل", numeric: "إجابة عددية", order: "ترتيب",
};
export const CHOICE_Q = ["single", "multiple", "truefalse"];
export type ExamQuestion = { type: string; prompt: string; points: number; options: string[]; correct: number[]; answer: string };
export type ExamDelivery = "online" | "paper" | "bubble";
export const EXAM_DELIVERY: Record<ExamDelivery, string> = { online: "اختبار إلكتروني", paper: "اختبار ورقي", bubble: "اختبار تظليل" };

export const blankQuestion = (): ExamQuestion => ({ type: "single", prompt: "", points: 1, options: ["", "", "", ""], correct: [0], answer: "" });

/** تغيير نوع السؤال يضبط البدائل: صح/خطأ ببديلين ثابتين، والاختياري يحتفظ ببدائله، والبقية بلا بدائل. */
export function withType(q: ExamQuestion, type: string): ExamQuestion {
  if (type === "truefalse") return { ...q, type, options: ["صح", "خطأ"], correct: [q.correct[0] === 1 ? 1 : 0] };
  if (type === "single" || type === "multiple") {
    const options = q.type === "single" || q.type === "multiple" ? q.options : ["", "", "", ""];
    return { ...q, type, options, correct: type === "single" ? [q.correct[0] ?? 0].filter((n) => n < options.length) : q.correct.filter((n) => n < options.length) };
  }
  return { ...q, type, options: [], correct: [] };
}

export function validateQuestions(questions: ExamQuestion[], delivery: ExamDelivery): string | null {
  if (!questions.length) return "أضف سؤالًا واحدًا على الأقل";
  if (delivery === "bubble" && questions.length > 35) return "ورقة التظليل تستوعب 35 سؤالًا كحد أقصى";
  for (const [i, q] of questions.entries()) {
    if (!q.prompt.trim() || !Number.isFinite(q.points) || q.points <= 0) return `أكمل نص ودرجة السؤال ${i + 1}`;
    if (delivery === "bubble" && !["single", "truefalse"].includes(q.type)) return "التظليل يحتاج إجابة واحدة لكل سؤال";
    if (CHOICE_Q.includes(q.type)) {
      if (q.options.length < 2 || q.options.length > 6 || q.options.some((o) => !o.trim())) return `أكمل بدائل السؤال ${i + 1}`;
      if (!q.correct.length || new Set(q.correct).size !== q.correct.length || q.correct.some((n) => !Number.isInteger(n) || n < 0 || n >= q.options.length) || (q.type !== "multiple" && q.correct.length !== 1))
        return `حدد الإجابة الصحيحة للسؤال ${i + 1}`;
    } else if (!q.answer.trim()) return `أكمل الإجابة النموذجية للسؤال ${i + 1}`;
  }
  return null;
}

export const examTotal = (qs: ExamQuestion[]) => qs.reduce((n, q) => n + (Number.isFinite(q.points) ? q.points : 0), 0);

type When = { d: string; t: string } | null;
export type ExamForm = {
  course_id: string; title: string; instructions: string; delivery: ExamDelivery; from: When; due: When; duration: string; count: string;
  audience: "all" | "selected"; students: string[];
};

export function examFormError(f: ExamForm, qs: ExamQuestion[], now = Date.now()): string | null {
  if (!f.title.trim()) return "أدخل اسم الاختبار";
  if (!f.course_id) return "اختر المقرر والشعبة";
  if (!f.due) return "حدد نهاية الاختبار";
  const due = Date.parse(riyadhIso(f.due)!);
  if (due <= now) return "نهاية الاختبار يجب أن تكون في المستقبل";
  if (f.from && Date.parse(riyadhIso(f.from)!) >= due) return "النهاية يجب أن تكون بعد بداية الاختبار";
  if (f.duration && !(Number.isInteger(Number(f.duration)) && Number(f.duration) >= 1 && Number(f.duration) <= 300)) return "المدة بين 1 و300 دقيقة";
  if (!(Number.isInteger(Number(f.count)) && Number(f.count) >= 1 && Number(f.count) <= 4)) return "عدد النماذج من 1 إلى 4";
  if (f.audience === "selected" && !f.students.length) return "اختر طالبًا واحدًا على الأقل";
  return validateQuestions(qs, f.delivery);
}

/** نفس معاملات exam_draft_save في المنصة: الدرجة الكاملة = مجموع درجات الأسئلة، ومحاولة واحدة. */
export function examArgs(f: ExamForm, qs: ExamQuestion[]) {
  return {
    _id: null,
    _d: {
      course_id: f.course_id, title: f.title.trim(), instructions: f.instructions, submission_types: f.delivery === "online" ? ["text"] : ["paper"],
      available_from: riyadhIso(f.from), due_at: riyadhIso(f.due), late_policy: "none", max_score: examTotal(qs), criteria: [],
      allow_resubmit: false, max_attempts: 1, audience: f.audience, students: f.audience === "selected" ? f.students : [],
    },
    _questions: qs.map((q) => (CHOICE_Q.includes(q.type) ? { ...q, answer: "" } : { ...q, options: [], correct: [] })),
    _delivery: f.delivery, _duration: f.duration ? Number(f.duration) : null, _count: Number(f.count),
  };
}

/** موعد ISO إلى يوم وساعة بتوقيت المدرسة (الرياض +03:00) لعرضه في منتقي الموعد. */
export function toRiyadhPick(iso: string | null | undefined): { d: string; t: string } | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  const r = new Date(ms + 3 * 36e5).toISOString();
  return { d: r.slice(0, 10), t: r.slice(11, 16) };
}
