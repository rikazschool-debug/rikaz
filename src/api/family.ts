import { supabase } from "./client";

/**
 * قراءات وكتابات أقسام الطالب وولي الأمر، منقولة كما هي من صفحات منصة ركاز.
 * كل استدعاء يمر بجلسة المستخدم؛ صلاحيات المنصة (RLS والدوال) هي الحَكَم.
 */
type Json = Record<string, unknown>;
const rpc = async <T>(name: string, args?: Json): Promise<T> => {
  const { data, error } = await supabase.rpc(name as never, (args ?? {}) as never);
  if (error) throw error;
  return data as unknown as T;
};
const uid = async () => (await supabase.auth.getUser()).data.user?.id ?? null;
export const newKey = () => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
  const r = (Math.random() * 16) | 0;
  return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
});

/* ---------- التواصل ---------- */
export type Conversation = {
  id: string; title: string | null; kind: string; status?: string | null; archived?: boolean | null; group_type?: string | null;
  student_name?: string | null; unread?: number | null; last_at?: string | null; last_body?: string | null;
  send_block?: string | null; allow_replies?: boolean | null; counterpart?: string | null; school_name?: string | null;
};
export type Message = { id: string; seq: number; body: string | null; mine: boolean; sender_name?: string | null; sender_label?: string | null; created_at?: string; deleted_at?: string | null; files?: { id: string; name: string }[] | null };
export type Contact = { user_id: string; full_name: string; label: string | null; kind?: string | null; school_name?: string | null };

export const fetchConversations = (schoolId: string) => rpc<Conversation[]>("my_conversations", { _school: schoolId }).then((r) => r ?? []);
export const fetchMessages = (conv: string, before: number | null = null) =>
  rpc<Message[]>("conv_messages", { _conv: conv, _before: before, _limit: 30 }).then((r) => [...(r ?? [])].sort((a, b) => a.seq - b.seq));
export const markConversationRead = (conv: string, seq: number) => rpc<unknown>("mark_conversation_read", { _conv: conv, _seq: seq });
export const sendMessage = (conv: string, body: string, clientId: string) => rpc<unknown>("send_message", { _conv: conv, _body: body, _client_id: clientId, _reply_to: null, _files: [] });
export const fetchStudentContacts = () => rpc<Contact[]>("student_contacts").then((r) => r ?? []);
export const startStudentConversation = (staff: string) => rpc<string>("start_student_admin_conversation", { _staff: staff });
export const fetchGuardianContacts = (student: string) => rpc<Contact[]>("guardian_contacts", { _student: student }).then((r) => (r ?? []).filter((c) => c.kind === "admin"));
export async function fetchGuardianLinks(schoolId: string): Promise<{ student_id: string; guardian_id: string; name: string }[]> {
  const me = await uid();
  if (!me) return [];
  const { data, error } = await supabase.from("student_guardians").select("student_id, guardian_id, students(full_name), guardians!inner(user_id)")
    .eq("school_id", schoolId).eq("guardians.user_id", me).eq("verified", true).eq("can_follow", true);
  if (error) throw error;
  return ((data ?? []) as unknown as { student_id: string; guardian_id: string; students: { full_name: string } | null }[]).map((r) => ({ student_id: r.student_id, guardian_id: r.guardian_id, name: r.students?.full_name ?? "" }));
}
export const startFamilyConversation = (student: string, guardian: string, staff: string) => rpc<string>("start_family_conversation", { _student: student, _guardian: guardian, _staff_user: staff });

/** صندوق الوارد كما في المنصة: مجموعات المواد/الشعب داخل الفصل الرقمي، والطالب يرى محادثاته ومجموعاته فقط. */
export function inbox(rows: Conversation[], role: "student" | "guardian", archive: boolean): Conversation[] {
  return rows.filter((c) => {
    const arch = !!c.archived || c.status === "archived";
    if (archive !== arch) return false;
    if (!archive && c.kind === "group" && ["course", "section", "class"].includes(c.group_type ?? "")) return false;
    if (role === "student" && c.kind !== "student" && c.kind !== "group") return false;
    return true;
  });
}
export const KIND_LABEL: Record<string, string> = { family: "تواصل أسرة", direct: "محادثة داخلية", group: "مجموعة", student: "محادثة طالب" };

/* ---------- الفصول الرقمية ---------- */
export type SectionRoom = { id: string; title: string; subjects?: number | null; teachers?: number | null; posts?: number | null };
export type RoomDetail = { id: string; title: string; school_id: string; view: string; subjects: { classroom_id: string; course_id: string; subject: string; teachers: string[] }[]; class_group?: string | null };
export type Post = { id: string; title: string; body: string | null; pinned: boolean | null; status: string; created_at: string; school_id: string; comments_enabled?: boolean | null };
export type PostFile = { id: string; name: string; storage_path: string; source_id: string; size_bytes?: number | null };
export type Comment = { id: string; body: string; created_at: string };

export const fetchRooms = (schoolId: string) => rpc<SectionRoom[]>("section_rooms_list", { _school: schoolId }).then((r) => r ?? []);
export const fetchRoom = (id: string) => rpc<RoomDetail>("section_room_get", { _room: id });
export async function fetchPosts(classroom: string): Promise<{ posts: Post[]; files: PostFile[] }> {
  const { data, error } = await supabase.from("classroom_posts").select("*").eq("classroom_id", classroom).eq("status", "published")
    .order("pinned", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw error;
  const posts = (data ?? []) as unknown as Post[];
  if (!posts.length) return { posts, files: [] };
  const f = await supabase.from("files").select("id,name,storage_path,source_id,size_bytes").eq("source_type", "post").in("source_id", posts.map((p) => p.id));
  if (f.error) throw f.error;
  return { posts, files: (f.data ?? []) as unknown as PostFile[] };
}
export async function fileUrl(f: { storage_path: string; name: string }): Promise<string | null> {
  const { data } = await supabase.storage.from("rikaz-files").createSignedUrl(f.storage_path, 60, { download: f.name });
  return data?.signedUrl ?? null;
}
export async function fetchComments(post: string): Promise<Comment[]> {
  const { data, error } = await supabase.from("post_comments").select("id, body, created_at").eq("post_id", post).order("created_at");
  if (error) throw error;
  return (data ?? []) as unknown as Comment[];
}
export async function addComment(post: Post, body: string) {
  const { error } = await supabase.from("post_comments").insert({ post_id: post.id, school_id: post.school_id, body: body.trim() } as never);
  if (error) throw error;
}

/* ---------- الخروج والاستئذان ---------- */
export const PICKUP_KIND: Record<string, string> = { quick: "استلام سريع", permission: "استئذان" };
export const PICKUP_STATUS: Record<string, string> = {
  submitted: "مقدم", under_review: "تحت المراجعة", approved: "معتمد", rejected: "مرفوض", arrived: "وصل المستلم",
  preparing: "جارٍ التجهيز", ready: "جاهز", handed_over: "تم التسليم", cancelled: "ملغى",
};
export const MOVE_LABEL: Record<string, string> = { in: "دخول", out: "خروج", return: "عودة" };
export const CANCELLABLE = ["submitted", "under_review", "approved", "arrived"];
export type PickupRequest = { id: string; student_id: string; kind: string; status: string; reason: string | null; pickup_name: string | null; planned_at: string | null; created_at: string; decision_note: string | null; handed_at: string | null; students?: { full_name: string } | null };
export type PickupChild = { student_id: string; can_pickup: boolean; name: string };
export type TimelineItem = { at: string; kind: "attendance" | "gate" | "pickup"; label: string; note?: string | null };

export async function fetchPickupChildren(schoolId: string): Promise<PickupChild[]> {
  const me = await uid();
  if (!me) return [];
  const { data, error } = await supabase.from("student_guardians").select("student_id, can_pickup, verified, guardians!inner(user_id), students(full_name)")
    .eq("guardians.user_id", me).eq("school_id", schoolId).eq("verified", true);
  if (error) throw error;
  return ((data ?? []) as unknown as { student_id: string; can_pickup: boolean; students: { full_name: string } | null }[]).map((r) => ({ student_id: r.student_id, can_pickup: !!r.can_pickup, name: r.students?.full_name ?? "" }));
}
export async function fetchAuthorizedPickups(student: string): Promise<{ id: string; full_name: string; relationship: string | null }[]> {
  const { data, error } = await supabase.from("authorized_pickups").select("id, full_name, relationship").eq("student_id", student).eq("active", true);
  if (error) throw error;
  return (data ?? []) as never;
}
export async function fetchMyPickupRequests(): Promise<PickupRequest[]> {
  const me = await uid();
  if (!me) return [];
  const { data, error } = await supabase.from("pickup_requests")
    .select("id, student_id, kind, status, reason, pickup_name, planned_at, created_at, decision_note, handed_at, students(full_name)")
    .eq("requested_by", me).order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  return (data ?? []) as unknown as PickupRequest[];
}
export type Delegate = { name: string; relationship: string; phone: string; id_last4: string; ack: boolean };
export type Recipient = { mode: "self" | "authorized" | "one_time"; person: string; delegate: Delegate };
/** نفس تحقق المنصة قبل الإرسال؛ الخادم يعيد التحقق. */
export function recipientError(r: Recipient): string | null {
  if (r.mode === "authorized" && !r.person) return "اختر المستلم المعتمد";
  if (r.mode === "one_time") {
    const d = r.delegate;
    if (d.name.trim().split(/\s+/).length < 3) return "اكتب الاسم الكامل للمفوَّض (ثلاثي على الأقل)";
    if (!d.relationship.trim()) return "صلة القرابة أو العلاقة مطلوبة";
    if (!/^\+?[0-9]{9,15}$/.test(d.phone.replace(/[\s-]/g, ""))) return "رقم الجوال غير صحيح";
    if (!/^[0-9]{4}$/.test(d.id_last4)) return "آخر 4 أرقام من هوية المفوَّض مطلوبة";
    if (!d.ack) return "إقرار التفويض مطلوب";
  }
  return null;
}
/** وقت HH:MM اليوم بتوقيت الرياض. */
export function plannedAt(time: string, today: string): string | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  return new Date(`${today}T${time}:00+03:00`).toISOString();
}
export const submitPickup = (p: { student: string; kind: "quick" | "permission"; reason: string | null; planned: string | null; recipient: Recipient }) =>
  rpc<unknown>("submit_pickup_request", {
    _student: p.student, _kind: p.kind, _reason: p.kind === "permission" ? p.reason : null, _planned_at: p.planned,
    _mode: p.recipient.mode, _person: p.recipient.mode === "authorized" ? p.recipient.person || null : null,
    _delegate: p.recipient.mode === "one_time" ? p.recipient.delegate : null,
  });
export const cancelPickup = (id: string, reason: string | null) => rpc<unknown>("cancel_pickup", { _id: id, _reason: reason });

const ATT: Record<string, string> = { present: "حاضر", late: "متأخر", pending_review: "غياب يحتاج مراجعة", absent: "غائب", excused: "غياب بعذر", in_school_absent: "دخل المدرسة ولم يحضر الفصل" };
/** الخط الزمني لآخر 30 يومًا: الحضور، الخروج من البوابة، طلبات الاستلام (حركات الدخول لا تُعرض). */
export async function fetchTimeline(student: string, from: string): Promise<TimelineItem[]> {
  const [a, g, p] = await Promise.all([
    supabase.from("attendance_days").select("date, status, late_minutes, first_in_at, note").eq("student_id", student).gte("date", from),
    supabase.from("gate_movements").select("date, kind, at, note").eq("student_id", student).gte("date", from),
    supabase.from("pickup_requests").select("req_date, kind, status, created_at, handed_at, pickup_name").eq("student_id", student).gte("req_date", from),
  ]);
  for (const r of [a, g, p]) if (r.error) throw r.error;
  const out: TimelineItem[] = [];
  for (const r of (a.data ?? []) as Json[]) out.push({ at: String(r.first_in_at ?? `${r.date}T00:00:00`), kind: "attendance", label: `${ATT[String(r.status)] ?? r.status}${r.late_minutes ? ` (${r.late_minutes} دقيقة)` : ""}`, note: r.note as string | null });
  for (const r of (g.data ?? []) as Json[]) if (r.kind !== "in") out.push({ at: String(r.at), kind: "gate", label: MOVE_LABEL[String(r.kind)] ?? String(r.kind), note: r.note as string | null });
  for (const r of (p.data ?? []) as Json[]) out.push({ at: String(r.handed_at ?? r.created_at), kind: "pickup", label: `${PICKUP_KIND[String(r.kind)] ?? r.kind} · ${PICKUP_STATUS[String(r.status)] ?? r.status}`, note: (r.pickup_name as string | null) ?? null });
  return out.sort((x, y) => y.at.localeCompare(x.at));
}
export async function fetchSelfStudent(): Promise<string | null> {
  const me = await uid();
  if (!me) return null;
  const { data } = await supabase.from("students").select("id").eq("user_id", me).limit(1);
  return ((data ?? []) as { id: string }[])[0]?.id ?? null;
}

/* ---------- الفعاليات ---------- */
export const EVT_KIND: Record<string, string> = { trip: "رحلة مدرسية", general: "فعالية عامة", course: "دورة" };
export const EVT_STATUS: Record<string, string> = { draft: "مسودة", published: "منشورة", cancelled: "ملغاة", completed: "مكتملة", archived: "مؤرشفة" };
export const APP_STATUS: Record<string, string> = { new: "جديد", review: "قيد المراجعة", info_needed: "مطلوب استكمال", accepted: "مقبول", rejected: "مرفوض", cancelled: "ملغى" };
export type FamilyEvent = {
  id: string; kind: string; title: string; description: string | null; status: string; location: string | null; school: string | null;
  student_id: string | null; student: string | null; cancel_reason: string | null; conditions: string | null;
  consent_required: boolean; consent_deadline: string | null; need_emergency: boolean; need_medical: boolean;
  sessions: { starts_at: string; ends_at: string | null; title: string | null }[];
  consent: null | { decision: string; at: string };
};
export type FamilyEvents = { guardian: boolean; events: FamilyEvent[]; courses: { id: string; title: string; description: string | null; school: string | null; location: string | null; trainer: string | null; reg_closes: string | null; sessions: { starts_at: string }[] }[]; apps: { id: string; ref: string | null; item: string; student: string | null; status: string; created_at: string }[] };
export const fetchEvents = () => rpc<FamilyEvents>("evt_family", {});
export const canConsent = (e: FamilyEvent, now = Date.now()) => e.status === "published" && e.consent_required && !!e.student_id && (!e.consent_deadline || new Date(e.consent_deadline).getTime() >= now);
export const giveConsent = (e: FamilyEvent, decision: "approved" | "declined", p: { emergency_name?: string; emergency_phone?: string; medical_ack?: boolean; medical_note?: string }) =>
  rpc<unknown>("evt_consent", { _item: e.id, _student: e.student_id, _decision: decision, _p: p });

/* ---------- التعاميم ---------- */
export type Circular = { id: string; title: string; body: string | null; status: string; created_at: string; published_at?: string | null; version?: number | null; ack_required?: boolean | null; circular_recipients?: { user_id: string; opened_at: string | null; ack_required_version: number | null }[]; circular_acks?: { user_id: string; version: number }[] };
export async function fetchCirculars(schoolId: string): Promise<{ me: string | null; rows: Circular[] }> {
  const me = await uid();
  const { data, error } = await supabase.from("circulars")
    .select("*, circular_recipients(user_id, opened_at, ack_required_version, first_version), circular_acks(user_id, version)")
    .or(`school_id.eq.${schoolId},target_schools.cs.{${schoolId}}`).neq("status", "draft").order("created_at", { ascending: false });
  if (error) throw error;
  return { me, rows: (data ?? []) as unknown as Circular[] };
}
/** يحتاج إقرارًا: نسخة الإقرار المطلوبة لهذا المستلم لم يُقرّ بها بعد. */
export function needsAck(c: Circular, me: string | null): boolean {
  const r = c.circular_recipients?.find((x) => x.user_id === me);
  if (!r?.ack_required_version) return false;
  return !(c.circular_acks ?? []).some((a) => a.user_id === me && a.version >= (r.ack_required_version ?? 0));
}
export const openCircular = (id: string) => rpc<unknown>("open_circular", { _id: id });
export const ackCircular = (id: string) => rpc<unknown>("ack_circular", { _id: id });

/* ---------- طلبات ولي الأمر ---------- */
export const REQ_KIND: Record<string, string> = { mother_account: "إضافة حساب دخول للأم", withdrawal: "طلب انسحاب", data_change: "طلب تعديل بيانات", other: "أخرى" };
export const REQ_STATUS: Record<string, string> = { processing: "جارٍ المعالجة", accepted: "مقبول", rejected: "مرفوض" };
export type FamilyRequest = { id: string; ref: string | null; kind: string; body: string; status: string; response: string | null; rejection_reason: string | null; created_at: string; students?: { full_name: string } | null };
export async function fetchFamilyRequests(orgId: string): Promise<FamilyRequest[]> {
  const me = await uid();
  if (!me) return [];
  const { data, error } = await supabase.from("family_requests").select("*, students(full_name)").eq("org_id", orgId).eq("requested_by", me)
    .order("created_at", { ascending: false }).order("id").range(0, 49);
  if (error) throw error;
  return (data ?? []) as unknown as FamilyRequest[];
}
export const createFamilyRequest = (student: string, kind: string, body: string) => rpc<unknown>("family_request_create", { _student: student, _kind: kind, _body: body });

/* ---------- الزيارات ---------- */
export const VISIT_STATUS: Record<string, string> = { pending: "بانتظار التأكيد", proposed: "مقترح تعديل", confirmed: "مؤكدة", rejected: "مرفوضة", cancelled: "ملغاة", arrived: "حضر", no_show: "لم يحضر", completed: "مكتملة", expired: "انقضى الموعد" };
export const VISIT_REASON: Record<string, string> = { academic: "أكاديمي", behavior: "سلوكي", attendance: "الحضور والغياب", health: "صحي", admin: "إداري", other: "أخرى" };
export const VISIT_SOURCE: Record<string, string> = { school: "استدعاء من المدرسة", guardian: "طلب من ولي الأمر" };
export type Visit = { id: string; rev: number; school_id: string; student_id: string; student: string | null; host: string | null; slot_date: string; slot_time: string; status: string; source: string; reason_cat: string | null; details: string | null; awaiting: string | null; conf_date: string | null; conf_time: string | null; decision_reason: string | null };
export const ACTIVE_VISIT = ["pending", "proposed", "confirmed"];
export async function fetchVisits(schoolId: string): Promise<Visit[]> {
  try { await rpc<unknown>("gv_expire_due", { _school: null }); } catch { /* اختياري كما في المنصة */ }
  return rpc<Visit[]>("gv_list", { _school: schoolId, _view: "mine", _q: null, _status: null, _from: null, _to: null }).then((r) => r ?? []);
}
export const fetchSlots = (schoolId: string, from: string, to: string) => rpc<{ day: string; at: string; free: boolean }[]>("gv_slots", { _school: schoolId, _from: from, _to: to, _exclude: null }).then((r) => r ?? []);
export const createVisit = (p: { student: string; reason: string; details: string; date: string; time: string }) =>
  rpc<unknown>("gv_create", { _p: { source: "guardian", student_id: p.student, reason_cat: p.reason, details: p.details, slot_date: p.date, slot_time: p.time } });
export const visitAction = (v: Visit, action: "confirm" | "decline" | "cancel", reason?: string) => rpc<unknown>("gv_act", { _id: v.id, _action: action, _rev: v.rev, _p: action === "confirm" ? {} : { reason: reason ?? "" } });
/** أفعال ولي الأمر حسب الحالة، كما في صفحة الزيارات بالمنصة. */
export function visitActions(v: Visit): ("confirm" | "decline" | "cancel")[] {
  if (["pending", "proposed"].includes(v.status) && v.awaiting === "guardian") return ["confirm", "decline"];
  return ACTIVE_VISIT.includes(v.status) ? ["cancel"] : [];
}
