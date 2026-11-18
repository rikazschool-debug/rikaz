import { supabase } from "./client";
import { putFile } from "./family";
import type { Att, Grade, Sub, TargetRow } from "../lib/homeworkRules";

/** تفاصيل الواجب والتسليم والتصحيح؛ نفس قراءات ودوال صفحة الواجب في المنصة، والصلاحيات في الخادم. */
type Json = Record<string, unknown>;
const rpc = async <T>(name: string, args: Json): Promise<T> => {
  const { data, error } = await supabase.rpc(name as never, args as never);
  if (error) throw error;
  return data as unknown as T;
};
export type HwFile = { id: string; name: string; storage_path: string; size_bytes?: number | null };
export type HwCriterion = { label: string; max: number };
export type HwDetail = {
  id: string; title: string; kind: string | null; status: string; instructions: string | null; submission_types: string[];
  max_score: number | null; max_attempts: number; due_at: string; late_until: string | null; criteria: HwCriterion[] | null; school_id: string;
  courses?: { subjects?: { name: string } | null } | null; sections?: { name: string } | null; files: HwFile[];
};

export async function fetchHomeworkDetail(id: string): Promise<HwDetail> {
  const [h, f] = await Promise.all([
    supabase.from("homework").select("id, title, kind, status, instructions, submission_types, max_score, max_attempts, due_at, late_until, criteria, school_id, courses(subjects(name)), sections(name)").eq("id", id).maybeSingle(),
    supabase.from("files").select("id, name, storage_path, size_bytes").eq("source_type", "homework").eq("source_id", id),
  ]);
  if (h.error) throw h.error;
  if (!h.data) throw new Error("not_found");
  return { ...(h.data as unknown as HwDetail), files: (f.data ?? []) as HwFile[] };
}

export type HwState = { can_submit: boolean; reason?: string | null; effective_due: string; attempts: number; max_attempts: number; is_late_now?: boolean | null };
export type MySubmission = { state: HwState; sub: Sub | null; attempts: Att[]; grade: Grade | null; draft: { body?: string | null; link_url?: string | null } | null; files: { attempt_no: number | null; files: HwFile }[] };

export async function fetchMySubmission(hw: string, student: string): Promise<MySubmission> {
  const [state, sub, atts, grade] = await Promise.all([
    supabase.rpc("hw_state" as never, { _hw: hw, _student: student } as never),
    supabase.from("homework_submissions").select("*").eq("homework_id", hw).eq("student_id", student).maybeSingle(),
    supabase.from("homework_attempts").select("*").eq("homework_id", hw).eq("student_id", student).order("attempt_no", { ascending: false }),
    supabase.from("homework_grades").select("*").eq("homework_id", hw).eq("student_id", student).maybeSingle(),
  ]);
  if (state.error) throw state.error;
  const sid = (sub.data as Sub | null)?.id;
  const [draft, links] = await Promise.all([
    sid ? supabase.from("homework_drafts").select("*").eq("submission_id", sid).maybeSingle() : Promise.resolve({ data: null }),
    sid ? supabase.from("homework_submission_files").select("attempt_no, files(id, name, storage_path, size_bytes)").eq("submission_id", sid) : Promise.resolve({ data: [] }),
  ]);
  return {
    state: state.data as unknown as HwState, sub: sub.data as Sub | null, attempts: (atts.data ?? []) as Att[], grade: grade.data as Grade | null,
    draft: draft.data as MySubmission["draft"], files: ((links.data ?? []) as unknown as MySubmission["files"]).filter((x) => x.files),
  };
}
export const saveDraft = (hw: string, body: string, link: string | null) => rpc<unknown>("save_submission_draft", { _hw: hw, _body: body, _link: link });
export const submitHomework = (hw: string, clientId: string) => rpc<unknown>("submit_homework", { _hw: hw, _client: clientId });
export async function uploadSubmissionFile(hw: string, f: { uri: string; name: string; mime: string; size: number }) {
  const rows = await rpc<{ id: string; storage_path: string }[]>("create_submission_file", { _hw: hw, _name: f.name, _mime: f.mime, _size: f.size });
  return putFile(rows[0]!, f.uri, f.mime);
}
export const removeSubmissionFile = (id: string) => rpc<unknown>("remove_submission_file", { _file: id });

/* ---------- المعلم: التسليمات والتصحيح ---------- */
export type GradedRow = TargetRow & { files: { submission_id: string; attempt_no: number; files: HwFile }[] };
export async function fetchSubmissions(hw: string): Promise<GradedRow[]> {
  const [t, s, a, g, f] = await Promise.all([
    supabase.from("homework_targets").select("student_id, removed_at, join_status, students(full_name)").eq("homework_id", hw),
    supabase.from("homework_submissions").select("*").eq("homework_id", hw),
    supabase.from("homework_attempts").select("*").eq("homework_id", hw).order("attempt_no"),
    supabase.from("homework_grades").select("*").eq("homework_id", hw),
    supabase.from("homework_submission_files").select("submission_id, attempt_no, files(id, name, storage_path, size_bytes)").not("attempt_no", "is", null),
  ]);
  for (const r of [t, s, a, g]) if (r.error) throw r.error;
  const subs = (s.data ?? []) as (Sub & { student_id: string })[];
  const atts = (a.data ?? []) as (Att & { student_id: string })[];
  const grades = (g.data ?? []) as (Grade & { student_id: string })[];
  const files = (f.data ?? []) as unknown as GradedRow["files"];
  return ((t.data ?? []) as unknown as { student_id: string; removed_at: string | null; join_status: string | null; students: { full_name: string } | null }[])
    .map((tg) => {
      const sub = subs.find((x) => x.student_id === tg.student_id) ?? null;
      return {
        student_id: tg.student_id, name: tg.students?.full_name ?? "", removed_at: tg.removed_at, join_status: tg.join_status, sub,
        atts: atts.filter((x) => x.student_id === tg.student_id), grade: grades.find((x) => x.student_id === tg.student_id) ?? null,
        files: files.filter((x) => sub && x.submission_id === sub.id && x.files),
      };
    })
    .sort((x, y) => x.name.localeCompare(y.name, "ar"));
}
export const gradeSubmission = (a: { sub: string; score: number | null; criteria: number[]; feedback: string; rev: number | null; final: boolean }) =>
  rpc<unknown>("grade_submission", { _sub: a.sub, _score: a.score, _criteria: a.criteria, _feedback: a.feedback, _rev: a.rev, _final: a.final });
export const returnSubmission = (sub: string, reason: string) => rpc<unknown>("return_submission", { _sub: sub, _reason: reason });
export const examResultAction = (sub: string, action: "review" | "approve", rev: number | null) => rpc<unknown>("exam_result_action", { _sub: sub, _action: action, _rev: rev });
export const publishResults = (hw: string, subs: string[] | null) => rpc<number>("publish_results", { _hw: hw, _subs: subs });

/* ---------- حل الاختبار الإلكتروني (exam_get يحجب الإجابات الصحيحة عن الطالب) ---------- */
export type ExamQ = { type: string; prompt: string; points: number; options: string[] };
export type ExamPaper = { delivery: string; can_grade: boolean; hidden?: boolean; duration_minutes: number | null; forms: { id: string; questions: ExamQ[] }[]; questions: ExamQ[] };
export const fetchExam = (hw: string) => rpc<ExamPaper>("exam_get", { _hw: hw });
export const submitExam = (hw: string, form: string, answers: (number[] | string)[], client: string) =>
  rpc<unknown>("exam_submit", { _hw: hw, _form: form, _answers: answers, _client: client });
