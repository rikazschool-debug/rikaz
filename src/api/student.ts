import { supabase } from "./client";
import type { AttRow, HomeworkRow, ResultRow, Slot } from "../lib/studentData";

/** ملف الطالب نفسه كما تعيده المنصة (family_child) — الخادم يتحقق أن الحساب هو الطالب. */
export interface StudentOverview {
  student: { id: string; name: string; school: string; section: string | null; grade: string | null };
  timetable: Slot[];
}

/** رقم الطالب لحساب الجلسة في المدرسة النشطة؛ سياسات المنصة تقصر القراءة على سجله. */
export async function fetchMyStudentId(schoolId: string): Promise<string | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase.from("students").select("id").eq("school_id", schoolId).eq("user_id", auth.user.id).maybeSingle();
  if (error) throw error;
  return (data as { id: string } | null)?.id ?? null;
}

export async function fetchOverview(studentId: string): Promise<StudentOverview> {
  const { data, error } = await supabase.rpc("family_child" as never, { _student: studentId } as never);
  if (error) throw error;
  return data as unknown as StudentOverview;
}

export async function fetchAttendance(studentId: string, from: string, to: string): Promise<{ today: string; rows: AttRow[] }> {
  const { data, error } = await supabase.rpc("family_attendance_range" as never, { _student: studentId, _from: from, _to: to } as never);
  if (error) throw error;
  return data as unknown as { today: string; rows: AttRow[] };
}

export async function fetchHomework(studentId: string): Promise<HomeworkRow[]> {
  const { data, error } = await supabase.rpc("student_homework" as never, { _student: studentId } as never);
  if (error) throw error;
  return (data as unknown as HomeworkRow[]) ?? [];
}

/** النتائج المنشورة الحالية فقط (الإصدارات المستبدلة لا تُقرأ). */
export async function fetchResults(schoolId: string, studentId: string): Promise<ResultRow[]> {
  const { data, error } = await supabase
    .from("grade_results")
    .select("id, student_id, subject_name, period_name, section_name, items, total, max_total, version, published_at, note, change_note")
    .is("superseded_at", null)
    .eq("school_id", schoolId)
    .eq("student_id", studentId)
    .order("published_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as ResultRow[]) ?? [];
}
