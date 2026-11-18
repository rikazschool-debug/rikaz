import React, { useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { Paperclip } from "lucide-react-native";
import { AppText, Button, Notice, TextField } from "../../components/ui";
import { Chips, DataState, Panel, Pill, SubScreen } from "../../components/StudentKit";
import { fileUrl, newKey } from "../../api/family";
import {
  examResultAction, fetchHomeworkDetail, fetchMySubmission, fetchSubmissions, gradeSubmission, publishResults, removeSubmissionFile,
  returnSubmission, saveDraft, submitHomework, uploadSubmissionFile, type GradedRow, type HwDetail, type HwFile,
} from "../../api/homework";
import { useLoad, errorText } from "../../hooks/useLoad";
import { useStudentQuery } from "../student/useStudentData";
import { schoolTime, SUB_STATUS } from "../../lib/studentData";
import { criteriaTotal, filterRows, GRADE_STATUS, readyToPublish, safeLink, scoreError, submitLabel, type Att, type GradeFilter } from "../../lib/homeworkRules";
import { AttachBar } from "./ChatMedia";
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
            {role === "teacher" ? <GradingPanel h={h} /> : <MinePanel h={h} readOnly={role === "guardian"} />}
          </>
        ) : null}
      </DataState>
    </SubScreen>
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
        <Notice tone="info">{types.includes("paper") ? "يُسلَّم الاختبار الورقي لدى المعلم." : "يُحل الاختبار الإلكتروني من منصة ركاز."}</Notice>
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
  grader: { gap: SPACING.md, paddingBottom: SPACING.md },
});
