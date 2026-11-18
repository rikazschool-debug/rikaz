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
