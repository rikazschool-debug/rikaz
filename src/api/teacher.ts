import { supabase } from "./client";
import type { EduKind, MarkStatus, TeacherSlot } from "../lib/teacherData";

/**
 * قراءات وكتابات أقسام المعلم، بالدوال والجداول نفسها في صفحات منصة ركاز.
 * الخادم (RLS ودوال la_* وadm_* وedu_*) هو من يقرر ما يُسمح به.
 */
type Json = Record<string, unknown>;
const rpc = async <T>(name: string, args?: Json): Promise<T> => {
  const { data, error } = await supabase.rpc(name as never, (args ?? {}) as never);
  if (error) throw error;
  return data as unknown as T;
};

/* ---------- الجدول ---------- */
type SlotRow = { id: string; day: number; periods: { name: string; sort_order: number; start_time: string | null; end_time: string | null } | null; courses: { subjects: { name: string } | null } | null; sections: { name: string; grades: { name: string } | null } | null; rooms: { name: string } | null };
export async function fetchMyTimetable(schoolId: string, date: string): Promise<TeacherSlot[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data: mine, error: e1 } = await supabase.from("teachers").select("id").eq("school_id", schoolId).eq("user_id", auth.user.id);
  if (e1) throw e1;
  const ids = ((mine ?? []) as { id: string }[]).map((r) => r.id);
  if (!ids.length) return [];
  const tt = await rpc<string | null>("current_timetable", { _school: schoolId, _date: date });
  if (!tt) return [];
  const { data, error } = await supabase.from("timetable_slots")
    .select("id, day, periods(name, sort_order, start_time, end_time), courses(subjects(name)), sections(name, grades(name)), rooms(name)")
    .eq("timetable_id", tt).in("teacher_id", ids);
  if (error) throw error;
  return ((data ?? []) as unknown as SlotRow[]).map((s) => ({
    id: s.id, day: s.day, period: s.periods?.name ?? "", sort: s.periods?.sort_order ?? 0,
    start: s.periods?.start_time ?? null, end: s.periods?.end_time ?? null,
    subject: s.courses?.subjects?.name ?? "مقرر", section: `${s.sections?.grades?.name ?? ""} / ${s.sections?.name ?? ""}`, room: s.rooms?.name ?? "",
  }));
}

/* ---------- تحضير الحصص ---------- */
export type Lesson = { slot_id: string; start: string; end?: string; period: string; subject: string; section: string; substitute?: boolean; session_id: string | null; status: "draft" | "approved" | "none" | null; absent: number; late: number; kind?: "daily" | "lesson" };
export type LessonMark = { student_id: string; name: string; status: MarkStatus; note: string | null };
export type LessonDetail = { id: string; date: string; status: "draft" | "approved"; rev: number; can_edit: boolean; subject: string; section: string; period: string; teacher: string; approved_at: string | null; marks: LessonMark[] };
export const fetchMyLessons = (date: string) => rpc<Lesson[]>("la_my_lessons", { _date: date }).then((r) => r ?? []);
export const openLesson = (slot: string, date: string) => rpc<string>("la_open", { _slot: slot, _date: date });
export const fetchLesson = (id: string) => rpc<LessonDetail>("la_get", { _id: id });
export const saveLesson = (id: string, rev: number, marks: { student_id: string; status: MarkStatus }[], reason: string | null) => rpc<number>("la_save", { _id: id, _rev: rev, _marks: marks, _reason: reason });
export const approveLesson = (id: string, rev: number) => rpc<unknown>("la_approve", { _id: id, _rev: rev });

/* ---------- الواجبات والاختبارات ---------- */
export type TeacherHomework = { id: string; title: string; kind: string | null; subject: string | null; section: string | null; status: string; due_at: string | null; targets: number | null; submitted: number | null; late: number | null; to_grade: number | null; total?: number };
export const fetchTeacherHomework = (schoolId: string, kind: "homework" | "test") =>
  rpc<TeacherHomework[]>("homework_list", { _school: schoolId, _course: null, _status: null, _q: null, _limit: 50, _offset: 0, _kind: kind }).then((r) => r ?? []);

/* ---------- التكليفات والمناوبات والاجتماعات ---------- */
export type Task = { id: string; title: string; assigner_name: string | null; status: string; priority: string; due_date: string | null; progress: number | null };
export const fetchMyTasks = (schoolId: string) =>
  rpc<Task[]>("adm_task_list", { _school: schoolId, _scope: "mine", _q: null, _status: null, _priority: null, _assignee: null, _dept: null, _from: null, _to: null, _limit: 50, _offset: 0 }).then((r) => r ?? []);

export type Duty = { id: string; post: string; date: string; start_time: string | null; end_time: string | null; status: string; substitute?: boolean; exec_status: string; ack_at: string | null; open_change?: string | null; cancel_reason?: string | null; exec_note?: string | null; rev: number };
export const fetchMyDuties = (schoolId: string, from: string, to: string) =>
  rpc<Duty[]>("adm_duty_list", { _school: schoolId, _scope: "mine", _q: null, _from: from, _to: to, _status: null, _post: null, _limit: 100, _offset: 0 }).then((r) => r ?? []);
export const ackDuty = (id: string) => rpc<unknown>("adm_duty_ack", { _id: id });
export const execDuty = (d: Duty, done: boolean, note: string) => rpc<unknown>("adm_duty_exec", { _id: d.id, _status: done ? "done" : "not_done", _note: note, _rev: d.rev });

export type Meeting = { id: string; title: string; mode: string | null; starts_at: string; duration_min: number | null; location: string | null; organizer_name: string | null; status: string };
export const fetchMyMeetings = (schoolId: string) =>
  rpc<Meeting[]>("adm_meeting_list", { _school: schoolId, _org: null, _scope: "mine", _q: null, _status: null, _mode: null, _from: null, _to: null, _limit: 50, _offset: 0 }).then((r) => r ?? []);

/* ---------- سجلات التوجيه والموهوبين والخطط والإشراف ---------- */
export type EduRecord = { id: string; person: string; course?: string; title: string; description: string; record_date: string; goals: string[]; status: string; priority: string; due_date: string | null; goals_done?: number; actions?: string; rating?: number | null };
const EMPTY_FILTER = { q: "", category: "", area: "", status: "", priority: "", from: "", to: "", overdue: false };
export const fetchEdu = (schoolId: string, kind: EduKind) =>
  rpc<{ rows: EduRecord[]; total: number }>("edu_find", { _school: schoolId, _kind: kind, _f: EMPTY_FILTER, _offset: 0, _limit: 50 }).then((r) => r?.rows ?? []);

/* ---------- تقييم المعلمين (ولي الأمر) ---------- */
export type EvalItem = { code: string; text: string; desc?: string | null; na?: boolean };
export type EvalTeacher = { teacher_id: string; name: string; subjects: string; rating: { answers: Record<string, number | "na">; comment: string | null; form_version: number; updated_at: string } | null };
export const fetchEvalChildren = () => rpc<{ id: string; name: string }[]>("ev_g_children", {}).then((r) => r ?? []);
export const fetchEvalTeachers = (student: string) => rpc<{ form: { id: string; version: number; title: string; items: EvalItem[] }; teachers: EvalTeacher[] }>("ev_g_teachers", { _student: student });
export const saveEval = (student: string, teacher: string, answers: Record<string, number | "na">, comment: string) =>
  rpc<unknown>("ev_g_save", { _student: student, _teacher: teacher, _answers: answers, _comment: comment });

/* ---------- إنشاء واجب: المقررات التي للمعلم عليها تكليف ساري فقط، والحفظ/النشر بدوال المنصة ---------- */
export type MyCourse = { id: string; subject: string; section: string; section_id?: string; year_id?: string };
export async function fetchMyCourses(schoolId: string): Promise<MyCourse[]> {
  const { data, error } = await supabase.from("courses").select("id, section_id, year_id, subjects(name), sections(name)").eq("school_id", schoolId);
  if (error) throw error;
  const rows = (data ?? []) as unknown as { id: string; section_id: string; year_id: string; subjects: { name: string } | null; sections: { name: string } | null }[];
  const mine = await Promise.all(rows.map(async (c) => {
    const r = await supabase.rpc("is_course_teacher" as never, { _course: c.id } as never);
    if (r.error) throw r.error;
    return r.data ? { id: c.id, subject: c.subjects?.name ?? "", section: c.sections?.name ?? "", section_id: c.section_id, year_id: c.year_id } : null;
  }));
  return mine.filter(Boolean) as MyCourse[];
}
export async function createHomework(payload: Record<string, unknown>, publish: boolean): Promise<{ id: string; published: string | null }> {
  const s = await supabase.rpc("save_homework" as never, { _id: null, _d: payload } as never);
  if (s.error) throw s.error;
  const id = s.data as unknown as string;
  const k = await supabase.rpc("set_homework_kind" as never, { _id: id, _kind: "homework" } as never);
  if (k.error) throw k.error;
  if (!publish) return { id, published: null };
  const p = await supabase.rpc("publish_homework" as never, { _id: id } as never);
  if (p.error) throw Object.assign(new Error("saved_not_published"), { cause: p.error, id });
  return { id, published: p.data as unknown as string };
}

/** طلاب الشعبة النشطون للمقرر (لاختيار طلاب بعينهم)؛ RLS في المنصة تحدد ما يظهر. */
export type RosterStudent = { id: string; name: string };
export async function fetchRoster(c: MyCourse): Promise<RosterStudent[]> {
  if (!c.section_id || !c.year_id) return [];
  const { data, error } = await supabase.from("enrollments").select("student_id, students(full_name)").eq("section_id", c.section_id).eq("year_id", c.year_id).eq("status", "active");
  if (error) throw error;
  return ((data ?? []) as unknown as { student_id: string; students: { full_name: string } | null }[])
    .map((r) => ({ id: r.student_id, name: r.students?.full_name ?? "" }))
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));
}

/** إنشاء اختبار: نفس exam_draft_save في المنصة، ثم publish_homework عند الطلب. */
export async function createExam(args: Record<string, unknown>, publish: boolean): Promise<{ id: string; published: string | null }> {
  const id = await rpc<string>("exam_draft_save", args);
  if (!publish) return { id, published: null };
  const p = await supabase.rpc("publish_homework" as never, { _id: id } as never);
  if (p.error) throw Object.assign(new Error("saved_not_published"), { cause: p.error, id });
  return { id, published: p.data as unknown as string };
}

/** إجراءات المعلم على واجب قائم — بنفس دوال صفحة الواجب في المنصة، والخادم يتحقق من الحالة والصلاحية. */
export const publishHw = (id: string) => rpc<string>("publish_homework", { _id: id });
export const reviseHw = (id: string, instructions: string, dueIso: string, note: string) =>
  rpc<unknown>("revise_homework", { _id: id, _d: { instructions, due_at: dueIso }, _note: note });
export const extendHw = (id: string, dueIso: string, reason: string) =>
  rpc<unknown>("extend_homework", { _id: id, _student: null, _due: dueIso, _reason: reason });
export const setHwStatus = (id: string, status: "closed" | "archived" | "cancelled", reason: string | null) =>
  rpc<unknown>("set_homework_status", { _id: id, _status: status, _reason: reason });
