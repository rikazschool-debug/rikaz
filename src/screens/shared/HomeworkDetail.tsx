import React, { useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { Paperclip } from "lucide-react-native";
import { AppText, Button, Notice, TextField } from "../../components/ui";
import { Chips, DataState, Panel, Pill, SubScreen } from "../../components/StudentKit";
import { fileUrl, newKey } from "../../api/family";
import {
  examResultAction, fetchHomeworkDetail, fetchMySubmission, fetchSubmissions, gradeSubmission, publishResults, removeSubmissionFile,
  returnSubmission, saveDraft, fetchExam, submitExam, submitHomework, uploadSubmissionFile, type GradedRow, type HwDetail, type HwFile,
} from "../../api/homework";
import { useLoad, errorText } from "../../hooks/useLoad";
import { useStudentQuery } from "../student/useStudentData";
import { schoolTime, SUB_STATUS } from "../../lib/studentData";
import { CHOICE_TYPES, examAnswers, toggleChoice, unanswered, criteriaTotal, filterRows, GRADE_STATUS, readyToPublish, safeLink, scoreError, submitLabel, type Att, type GradeFilter } from "../../lib/homeworkRules";
import { AttachBar } from "./ChatMedia";
import { extendHw, publishHw, reviseHw, setHwStatus } from "../../api/teacher";
import { When } from "../teacher/NewHomework";
import { riyadhIso } from "../../lib/homeworkRules";
import { toRiyadhPick } from "../../lib/examRules";
import { COLORS, SPACING } from "../../theme/tokens";

const TYPE_LABEL: Record<string, string> = { text: "نص", file: "ملفات", link: "رابط", paper: "ورقي" };
const subTone = (s: string) => (s === "returned" ? "danger" : ["submitted", "resubmitted", "paper"].includes(s) ? "success" : "accent") as "danger" | "success" | "accent";

const FileRows: React.FC<{ files: HwFile[]; onRemove?: (f: HwFile) => void }> = ({ files, onRemove }) => (
  <View style={styles.gapSm}>
    {files.map((f) => (
      <View key={f.id} style={styles.fileRow}>
        <Paperclip size={16} color={COLORS.primary} />
        <AppText variant="caption" color={COLORS.primary} style={styles.flex} numberOfLines={1} accessibilityRole="link"
          onPress={async () => { const u = await fileUrl(f); if (u) void Linking.openURL(u); }}>{f.name}</AppText>
        {onRemove ? <AppText variant="micro" weight="bold" color={COLORS.destructive} accessibilityRole="button" onPress={() => onRemove(f)}>حذف</AppText> : null}
      </View>
    ))}
  </View>
);

const AttemptCard: React.FC<{ a: Att; files: HwFile[]; current?: boolean }> = ({ a, files, current }) => {
  const link = safeLink(a.link_url);
  return (
    <View style={styles.attempt}>
      <AppText variant="micro" color={COLORS.mutedForeground}>
        {`المحاولة ${a.attempt_no}${current ? " (المعتمدة للتصحيح)" : ""} · ${a.kind === "paper" ? "ورقي سجّله المعلم" : "إلكتروني"} · ${schoolTime(a.submitted_at)}`}
      </AppText>
      {a.is_late ? <AppText variant="micro" color={COLORS.destructive}>متأخر</AppText> : null}
      {a.body ? <AppText variant="body">{a.body}</AppText> : null}
      {link ? <AppText variant="caption" color={COLORS.primary} onPress={() => void Linking.openURL(link)}>{a.link_url}</AppText> : null}
      {a.note ? <AppText variant="micro">{`ملاحظة: ${a.note}`}</AppText> : null}
      <FileRows files={files} />
    </View>
  );
};

const Hero: React.FC<{ h: HwDetail }> = ({ h }) => (
  <Panel style={styles.card}>
    <AppText variant="micro" color={COLORS.mutedForeground}>{[h.courses?.subjects?.name, h.sections?.name && `شعبة ${h.sections.name}`].filter(Boolean).join(" · ")}</AppText>
    <AppText variant="caption">{`موعد التسليم: ${schoolTime(h.due_at)}`}</AppText>
    <AppText variant="caption">{`التسليم: ${h.submission_types.map((t) => TYPE_LABEL[t] ?? t).join("، ")} · ${h.max_attempts} محاولة`}</AppText>
    <AppText variant="caption">{`التقييم: ${h.max_score == null ? "دون درجة" : `من ${h.max_score}`}`}</AppText>
    {h.instructions ? <AppText variant="body" style={styles.instr}>{h.instructions}</AppText> : null}
    <FileRows files={h.files} />
  </Panel>
);

/** صفحة الواجب: الطالب يسلّم، ولي الأمر يطّلع، والمعلم يصحّح — كما في المنصة. */
export const HomeworkDetail: React.FC<{ id: string; role: "student" | "guardian" | "teacher"; onBack: () => void }> = ({ id, role, onBack }) => {
  const q = useLoad(() => fetchHomeworkDetail(id), [id]);
  const h = q.data;
  return (
    <SubScreen title={h?.title ?? "الواجب"} eyebrow={h?.kind === "test" ? "اختبار" : "واجب"} onBack={onBack} refreshing={q.loading} onRefresh={q.reload}>
      <DataState loading={q.loading && !h} error={q.error} onRetry={q.reload}>
        {h ? (
          <>
            <Hero h={h} />
            {role === "teacher" ? <TeacherActions h={h} onDone={q.reload} /> : null}
            {role === "teacher" ? <GradingPanel h={h} /> : <MinePanel h={h} readOnly={role === "guardian"} />}
          </>
        ) : null}
      </DataState>
    </SubScreen>
  );
};

/* ---------- إجراءات المعلم: نشر المسودة، التعديل بعد النشر، التمديد، الإغلاق، الأرشفة، الإلغاء ---------- */
type Mode = null | "revise" | "extend" | "cancel";
const TeacherActions: React.FC<{ h: HwDetail; onDone: () => void }> = ({ h, onDone }) => {
  const [mode, setMode] = useState<Mode>(null);
  const [instr, setInstr] = useState(h.instructions ?? "");
  const [due, setDue] = useState(toRiyadhPick(h.due_at));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const s = h.status;
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true); setMsg(null);
    try { const r = await fn(); setMsg({ tone: "success", text: r === "scheduled" ? "جُدول النشر في وقت الإتاحة" : ok }); setMode(null); setReason(""); onDone(); }
    catch (e) { setMsg({ tone: "error", text: errorText(e) }); } finally { setBusy(false); }
  };
  const open = (m: Mode) => { setMsg(null); setReason(""); setInstr(h.instructions ?? ""); setDue(toRiyadhPick(h.due_at)); setMode(mode === m ? null : m); };
  const dueIso = riyadhIso(due);
  if (!["draft", "scheduled", "published", "closed"].includes(s)) return null;
  return (
    <Panel style={styles.actions}>
      <AppText variant="bodyStrong" weight="extrabold">إدارة {h.kind === "test" ? "الاختبار" : "الواجب"}</AppText>
      <View style={styles.actRow}>
        {s === "draft" ? <Button title="نشر" loading={busy && !mode} disabled={busy} onPress={() => void run(() => publishHw(h.id), "نُشر وأُبلغ الطلاب وأولياء أمورهم")} /> : null}
        {["scheduled", "published", "closed"].includes(s) ? <Button title="تعديل بعد النشر" variant="secondary" disabled={busy} onPress={() => open("revise")} /> : null}
        {["published", "closed"].includes(s) ? <Button title="تمديد للجميع" variant="secondary" disabled={busy} onPress={() => open("extend")} /> : null}
        {s === "published" ? <Button title="إغلاق التسليم" variant="secondary" disabled={busy} onPress={() => void run(() => setHwStatus(h.id, "closed", null), "أُغلق التسليم")} /> : null}
        {["published", "closed"].includes(s) ? <Button title="أرشفة" variant="secondary" disabled={busy} onPress={() => void run(() => setHwStatus(h.id, "archived", null), "أُرشف")} /> : null}
        {["draft", "scheduled", "published"].includes(s) ? <Button title="إلغاء" variant="destructive" disabled={busy} onPress={() => open("cancel")} /> : null}
      </View>
      {mode === "revise" ? (
        <View style={styles.form}>
          <TextField label="التعليمات" value={instr} onChangeText={setInstr} multiline maxLength={8000} />
          <When label="موعد التسليم" value={due} onChange={setDue} />
          <TextField label="سبب التعديل (يظهر للطلاب)" value={reason} onChangeText={setReason} maxLength={500} />
          <AppText variant="micro" color={COLORS.mutedForeground}>لا يمكن تغيير الدرجة القصوى أو نوع التسليم بعد وجود تسليمات، ولا تقديم الموعد إلى وقت مضى.</AppText>
          <Button title="حفظ التعديل" loading={busy} disabled={busy || !dueIso} onPress={() => void run(() => reviseHw(h.id, instr, dueIso!, reason.trim()), "حُفظ التعديل كإصدار جديد وأُبلغ الطلاب")} />
        </View>
      ) : null}
      {mode === "extend" ? (
        <View style={styles.form}>
          <When label="الموعد الجديد للجميع" value={due} onChange={setDue} />
          <TextField label="السبب" value={reason} onChangeText={setReason} maxLength={500} />
          <Button title="تمديد" loading={busy} disabled={busy || !dueIso} onPress={() => void run(() => extendHw(h.id, dueIso!, reason.trim()), "مُدد الموعد وأُبلغ الطلاب")} />
        </View>
      ) : null}
      {mode === "cancel" ? (
        <View style={styles.form}>
          <TextField label="سبب الإلغاء (إجراء موثق)" value={reason} onChangeText={setReason} maxLength={500} />
          <Button title="تأكيد الإلغاء" variant="destructive" loading={busy} disabled={busy || !reason.trim()} onPress={() => void run(() => setHwStatus(h.id, "cancelled", reason.trim()), "أُلغي")} />
        </View>
      ) : null}
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
    </Panel>
  );
};

/* ---------- الطالب / ولي الأمر ---------- */
const MinePanel: React.FC<{ h: HwDetail; readOnly: boolean }> = ({ h, readOnly }) => {
  const [n, setN] = useState(0);
  const d = useStudentQuery((_, sid) => fetchMySubmission(h.id, sid), [h.id, n]);
  const refresh = () => setN((x) => x + 1);
  const [body, setBody] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const clientId = useMemo(() => newKey(), [d.data?.sub?.attempt_count]);
  if (!d.data) return <DataState loading={d.loading} error={d.error} missing={d.missing} onRetry={d.reload} />;
  const x = d.data;
  const st = x.sub?.status ?? "none";
  const types = h.submission_types;
  const b = body ?? x.draft?.body ?? "";
  const l = link ?? x.draft?.link_url ?? "";
  const draftFiles = x.files.filter((f) => f.attempt_no == null).map((f) => f.files);
  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key); setMsg(null);
    try { await fn(); setMsg({ tone: "success", text: ok }); refresh(); } catch (e) { setMsg({ tone: "error", text: errorText(e) }); } finally { setBusy(null); }
  };
  const canEdit = !readOnly && h.kind !== "test" && x.state.can_submit;
  return (
    <Panel style={styles.card}>
      <View style={styles.head}>
        <AppText variant="bodyStrong" weight="extrabold" style={styles.flex}>{readOnly ? "تسليم الابن" : "تسليمي"}</AppText>
        <Pill label={SUB_STATUS[st] ?? st} tone={subTone(st)} />
      </View>
      <AppText variant="caption">{`الموعد: ${schoolTime(x.state.effective_due)}${x.state.effective_due !== h.due_at ? " (ممدد)" : ""} · المحاولات ${x.state.attempts} من ${x.state.max_attempts}`}</AppText>
      {st === "returned" ? <Notice tone="error" title="أعاده المعلم للاستكمال">{x.sub?.returned_reason ?? ""}</Notice> : null}
      {x.grade ? (
        <View style={styles.grade}>
          <AppText variant="bodyStrong">{x.grade.score != null ? `الدرجة: ${x.grade.score} من ${h.max_score}` : "ملاحظات المعلم"}</AppText>
          {x.grade.feedback ? <AppText variant="body">{x.grade.feedback}</AppText> : null}
        </View>
      ) : h.max_score != null && x.attempts.length ? <AppText variant="micro" color={COLORS.mutedForeground}>لم يُصحَّح بعد.</AppText> : null}

      {readOnly ? null : h.kind === "test" ? (
        <ExamSolve h={h} done={x.attempts.length > 0} onDone={refresh} />
      ) : !canEdit ? (
        <Notice tone="warning" title="التسليم غير متاح">{x.state.reason ?? ""}</Notice>
      ) : (
        <View style={styles.gap}>
          {x.state.is_late_now ? <AppText variant="caption" color={COLORS.destructive}>تجاوزت الموعد؛ سيُوسم تسليمك متأخرًا.</AppText> : null}
          {types.includes("text") ? <TextField label="إجابتك" value={b} onChangeText={setBody} multiline /> : null}
          {types.includes("link") ? <TextField label="الرابط" value={l} onChangeText={setLink} ltr autoCapitalize="none" placeholder="https://" /> : null}
          {types.includes("file") ? (
            <View style={styles.gapSm}>
              <FileRows files={draftFiles} onRemove={(f) => void run("rm", () => removeSubmissionFile(f.id), "حُذف الملف")} />
              <AttachBar disabled={!!busy} onError={(t) => setMsg({ tone: "error", text: t })}
                onPick={(fs) => void run("up", async () => { for (const f of fs) await uploadSubmissionFile(h.id, f); }, "اكتمل رفع الملف — لم يُسلَّم بعد")} />
              {busy === "up" ? <AppText variant="micro" color={COLORS.mutedForeground}>جارٍ الرفع… (الرفع وحده لا يعني التسليم)</AppText> : null}
            </View>
          ) : null}
          <AppText variant="micro" color={COLORS.mutedForeground}>الوقت المعتمد هو وقت ضغطك «تسليم»، وليس بدء الرفع.</AppText>
          <Button title={submitLabel(x.state.attempts)} loading={busy === "submit"} disabled={!!busy}
            onPress={() => void run("submit", async () => { await saveDraft(h.id, b, l.trim() || null); await submitHomework(h.id, clientId); setBody(null); setLink(null); }, "تم استلام التسليم")} />
          <Button title="حفظ مسودة (لا تُعد تسليمًا)" variant="secondary" loading={busy === "draft"} disabled={!!busy}
            onPress={() => void run("draft", () => saveDraft(h.id, b, l.trim() || null), "حُفظت المسودة — لم تُسلَّم بعد")} />
        </View>
      )}
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
      {x.attempts.length ? <AppText variant="label" weight="bold">سجل المحاولات</AppText> : null}
      {x.attempts.map((a) => <AttemptCard key={a.id} a={a} files={x.files.filter((f) => f.attempt_no === a.attempt_no).map((f) => f.files)} />)}
    </Panel>
  );
};

/* ---------- حل الاختبار الإلكتروني ---------- */
const ExamSolve: React.FC<{ h: HwDetail; done: boolean; onDone: () => void }> = ({ h, done, onDone }) => {
  const q = useLoad(() => fetchExam(h.id), [h.id]);
  const [form, setForm] = useState<string>("");
  const [ans, setAns] = useState<Record<number, number[] | string>>({});
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const client = useMemo(() => newKey(), []);
  if (done) return <Notice tone="success">سلّمت هذا الاختبار ولا يمكن تسليمه مرة أخرى. تظهر الدرجة بعد مراجعتها واعتمادها ونشرها.</Notice>;
  if (!q.data) return <DataState loading={q.loading} error={q.error} onRetry={q.reload} />;
  const p = q.data;
  if (p.delivery !== "online" || p.hidden) return <Notice tone="info" title={p.delivery === "bubble" ? "اختبار تظليل" : "اختبار ورقي"}>يُحل الاختبار داخل الصف على ورقة يوزّعها المعلم في موعد الاختبار، ثم يصححها ويرصد النتيجة.</Notice>;
  const forms = p.forms?.length ? p.forms : [{ id: "A", questions: p.questions }];
  const cur = forms.find((f) => f.id === form) ?? forms[0]!;
  const left = unanswered(cur.questions, ans);
  const send = async () => {
    setBusy(true); setErr(null);
    try { await submitExam(h.id, cur.id, examAnswers(cur.questions, ans), client); onDone(); } catch (e) { setErr(errorText(e)); setConfirm(false); } finally { setBusy(false); }
  };
  return (
    <View style={styles.gap}>
      <AppText variant="bodyStrong" weight="extrabold">حل الاختبار الإلكتروني</AppText>
      {p.duration_minutes ? <AppText variant="caption">{`المدة: ${p.duration_minutes} دقيقة`}</AppText> : null}
      {forms.length > 1 ? <Chips label="النموذج" value={cur.id} onChange={(v) => { setForm(v); setAns({}); }} items={forms.map((f) => ({ key: f.id, label: `النموذج ${f.id}` }))} /> : null}
      {cur.questions.map((qq, i) => (
        <View key={`${cur.id}-${i}`} style={styles.attempt}>
          <AppText variant="bodyStrong">{`${i + 1}. ${qq.prompt} (${qq.points})`}</AppText>
          {CHOICE_TYPES.includes(qq.type) ? qq.options.map((o, j) => {
            const on = Array.isArray(ans[i]) && (ans[i] as number[]).includes(j);
            return (
              <Pressable key={j} disabled={busy} onPress={() => setAns((a) => ({ ...a, [i]: toggleChoice(qq.type, a[i], j) }))}
                accessibilityRole={qq.type === "multiple" ? "checkbox" : "radio"} accessibilityState={{ checked: on }} style={[styles.opt, on && styles.optOn]}>
                <View style={[styles.dot, qq.type === "multiple" && styles.square, on && styles.dotOn]} />
                <AppText variant="body" style={styles.flex}>{o}</AppText>
              </Pressable>
            );
          }) : <TextField label={`إجابة السؤال ${i + 1}`} value={typeof ans[i] === "string" ? (ans[i] as string) : ""} onChangeText={(v) => setAns((a) => ({ ...a, [i]: v }))} multiline editable={!busy} />}
        </View>
      ))}
      {err ? <Notice tone="error">{err}</Notice> : null}
      {confirm ? (
        <Notice tone="warning" title="تأكيد التسليم">{left ? `بقي ${left} سؤال دون إجابة. ` : ""}لا يمكن تعديل الإجابات بعد التسليم.</Notice>
      ) : null}
      <Button title={confirm ? "تأكيد تسليم الاختبار" : "تسليم الاختبار"} loading={busy} disabled={busy || h.status !== "published"} onPress={() => (confirm ? void send() : setConfirm(true))} />
      {confirm ? <Button title="متابعة الحل" variant="ghost" disabled={busy} onPress={() => setConfirm(false)} /> : null}
    </View>
  );
};

/* ---------- المعلم ---------- */
const GradingPanel: React.FC<{ h: HwDetail }> = ({ h }) => {
  const q = useLoad(() => fetchSubmissions(h.id), [h.id]);
  const [filter, setFilter] = useState<GradeFilter>("all");
  const [sel, setSel] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const isTest = h.kind === "test";
  if (h.status === "draft") return <Notice tone="info" title="المسودة غير منشورة">تظهر التسليمات بعد النشر.</Notice>;
  const rows = q.data ?? [];
  const labels: Record<GradeFilter, string> = { all: "الكل", missing: "لم يسلّم", late: "متأخر", returned: "معاد", to_grade: "يحتاج تصحيحًا", to_publish: isTest ? "معتمد للنشر" : "غير ظاهر" };
  const shown = filterRows(rows, filter, isTest);
  const ready = filterRows(rows, "to_publish", isTest).length;
  const current = rows.find((r) => r.student_id === sel) ?? null;
  return (
    <View style={styles.gap}>
      <Chips label="التصفية" value={filter} onChange={setFilter} items={(Object.keys(labels) as GradeFilter[]).map((k) => ({ key: k, label: `${labels[k]} (${filterRows(rows, k, isTest).length})` }))} />
      {ready > 0 ? (
        <Button title={`${isTest ? "نشر النتائج المعتمدة" : "إظهار التصحيحات السابقة"} (${ready})`} variant="secondary"
          onPress={async () => { try { const n = await publishResults(h.id, null); setMsg({ tone: "success", text: `ظهرت ${n} درجة` }); q.reload(); } catch (e) { setMsg({ tone: "error", text: errorText(e) }); } }} />
      ) : null}
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
      <DataState loading={q.loading && !q.data} error={q.error} empty={!shown.length} emptyTitle="لا يوجد طلاب هنا" onRetry={q.reload}>
        <Panel>
          {shown.map((r, i) => {
            const last = r.atts[r.atts.length - 1];
            const on = r.student_id === sel;
            return (
              <View key={r.student_id}>
                <Pressable accessibilityRole="button" accessibilityState={{ expanded: on }} onPress={() => setSel(on ? null : r.student_id)} style={[styles.stuRow, i > 0 && styles.border]}>
                  <View style={styles.flex}>
                    <AppText variant="bodyStrong" numberOfLines={1}>{r.name}</AppText>
                    <AppText variant="micro" color={COLORS.mutedForeground}>
                      {`${last ? `#${last.attempt_no} · ${schoolTime(last.submitted_at)}${last.is_late ? " · متأخر" : ""}` : "لا محاولات"} · ${GRADE_STATUS[r.grade?.status ?? "none"] ?? ""}${r.grade?.score != null ? ` · ${r.grade.score}` : ""}`}
                    </AppText>
                  </View>
                  <Pill label={SUB_STATUS[r.sub?.status ?? "none"] ?? ""} tone={subTone(r.sub?.status ?? "none")} />
                </Pressable>
                {on && current ? <Grader key={`${current.student_id}-${current.grade?.rev ?? 0}`} h={h} r={current} onDone={(t) => { setMsg({ tone: "success", text: t }); q.reload(); }} /> : null}
              </View>
            );
          })}
        </Panel>
      </DataState>
    </View>
  );
};

const Grader: React.FC<{ h: HwDetail; r: GradedRow; onDone: (msg: string) => void }> = ({ h, r, onDone }) => {
  const g = r.grade;
  const crit = h.criteria ?? [];
  const graded = h.max_score != null;
  const isTest = h.kind === "test";
  const published = !!g?.published_at;
  const [score, setScore] = useState(g?.score?.toString() ?? "");
  const [fb, setFb] = useState(g?.feedback ?? "");
  const [cs, setCs] = useState<string[]>(crit.map((_, i) => g?.criteria_scores?.[i]?.toString() ?? ""));
  const [ret, setRet] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const sub = r.sub;
  const call = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key); setErr(null);
    try { await fn(); onDone(ok); } catch (e) {
      const m = errorText(e);
      setErr(/rev|stale|تعارض|حديث/i.test(m) ? "عُدّل هذا التصحيح من مكان آخر. حدّث الصفحة وقارن قبل الحفظ." : m);
    } finally { setBusy(null); }
  };
  const save = () => {
    if (graded && !crit.length) { const e = scoreError(score, h.max_score!); if (e) return setErr(e); }
    if (crit.some((c, i) => scoreError(cs[i] ?? "", c.max))) return setErr("تحقق من درجات المعايير");
    void call("grade", () => gradeSubmission({ sub: sub!.id, score: graded && !crit.length ? Number(score) : null, criteria: crit.length ? cs.map(Number) : [], feedback: fb, rev: g?.rev ?? null, final: !isTest }),
      isTest ? "حُفظت النتيجة الأولية للمراجعة دون نشر" : published ? "حُفظ التعديل وسُجل في السجل" : "حُفظ التصحيح وظهرت الدرجة للطالب وولي أمره");
  };
  const canGrade = !!sub && (sub.attempt_count ?? 0) > 0 && sub.status !== "returned";
  return (
    <View style={styles.grader}>
      {!r.atts.length ? <AppText variant="caption" color={COLORS.mutedForeground}>لم يسلّم بعد. عدم التسليم لا يتحول إلى صفر تلقائيًا.</AppText> : null}
      {[...r.atts].reverse().map((a) => <AttemptCard key={a.id} a={a} current={a.attempt_no === sub?.attempt_count} files={r.files.filter((f) => f.attempt_no === a.attempt_no).map((f) => f.files)} />)}
      {canGrade ? (
        <View style={styles.gap}>
          {graded ? (crit.length ? (
            <>
              {crit.map((c, i) => <TextField key={i} label={`${c.label} (0–${c.max})`} value={cs[i] ?? ""} keyboardType="decimal-pad" ltr onChangeText={(v) => setCs(cs.map((x, j) => (j === i ? v : x)))} />)}
              <AppText variant="caption">{`المجموع: ${criteriaTotal(cs)} / ${h.max_score}`}</AppText>
            </>
          ) : <TextField label={`الدرجة (0–${h.max_score})`} value={score} onChangeText={setScore} keyboardType="decimal-pad" ltr />) : null}
          <TextField label="ملاحظات للطالب" value={fb} onChangeText={setFb} multiline />
          <Button title={isTest ? "حفظ نتيجة أولية" : published ? "حفظ التعديل" : "حفظ التصحيح وإظهار الدرجة"} loading={busy === "grade"} disabled={!!busy} onPress={save} />
          {isTest && g && !published && !g.needs_review && !g.exam_reviewed_at ? <Button title="تأكيد المراجعة" variant="secondary" disabled={!!busy} onPress={() => void call("rev", () => examResultAction(sub!.id, "review", g.rev ?? null), "تمت مراجعة النتيجة")} /> : null}
          {isTest && g && !published && g.exam_reviewed_at && !g.exam_approved_at ? <Button title="اعتماد النتيجة" variant="secondary" disabled={!!busy} onPress={() => void call("app", () => examResultAction(sub!.id, "approve", g.rev ?? null), "اعتمدت النتيجة دون نشر")} /> : null}
          {g && readyToPublish(r, isTest) ? <Button title={isTest ? "نشر النتيجة" : "إظهار التصحيح"} variant="secondary" disabled={!!busy} onPress={() => void call("pub", () => publishResults(h.id, [sub!.id]), "نُشرت النتيجة")} /> : null}
          <TextField label="سبب الإعادة للاستكمال" value={ret} onChangeText={setRet} />
          <Button title="إعادة للاستكمال" variant="destructive" disabled={!ret.trim() || !!busy} onPress={() => void call("ret", () => returnSubmission(sub!.id, ret.trim()), "أُعيد للطالب للاستكمال")} />
        </View>
      ) : null}
      {err ? <Notice tone="error">{err}</Notice> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  actions: { paddingVertical: SPACING.md, gap: SPACING.sm },
  actRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  form: { gap: SPACING.sm },
  flex: { flex: 1 },
  gap: { gap: SPACING.md },
  gapSm: { gap: SPACING.sm },
  card: { paddingVertical: SPACING.md, gap: SPACING.sm },
  head: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  instr: { marginTop: SPACING.xs },
  fileRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, minHeight: 32 },
  attempt: { backgroundColor: COLORS.muted, borderRadius: 12, padding: SPACING.md, gap: 4 },
  grade: { backgroundColor: COLORS.primaryTint, borderRadius: 12, padding: SPACING.md, gap: 4 },
  stuRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, paddingVertical: SPACING.md, minHeight: 56 },
  border: { borderTopWidth: 1, borderTopColor: COLORS.border },
  opt: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, minHeight: 44, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: SPACING.md, backgroundColor: COLORS.card },
  optOn: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryTint },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.border },
  square: { borderRadius: 5 },
  dotOn: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  grader: { gap: SPACING.md, paddingBottom: SPACING.md },
});
