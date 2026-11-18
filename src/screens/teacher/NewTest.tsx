import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText, Button, Notice, TextField } from "../../components/ui";
import { Chips, DataState, Panel, SubScreen } from "../../components/StudentKit";
import { createExam, fetchMyCourses } from "../../api/teacher";
import { useAuth } from "../../hooks/useAuth";
import { errorText, useLoad } from "../../hooks/useLoad";
import { riyadhIso } from "../../lib/homeworkRules";
import { blankQuestion, CHOICE_Q, EXAM_DELIVERY, examArgs, examFormError, examTotal, QUESTION_TYPES, withType, type ExamDelivery, type ExamForm, type ExamQuestion } from "../../lib/examRules";
import { AudiencePicker, When } from "./NewHomework";
import { COLORS, SPACING } from "../../theme/tokens";

/** محرر سؤال واحد: النوع، النص، الدرجة، ثم البدائل والإجابة الصحيحة أو الإجابة النموذجية. */
const QuestionEditor: React.FC<{ q: ExamQuestion; i: number; delivery: ExamDelivery; onChange: (q: ExamQuestion) => void; onRemove?: () => void; onMove?: (d: -1 | 1) => void }> = ({ q, i, delivery, onChange, onRemove, onMove }) => {
  const types = Object.entries(QUESTION_TYPES).filter(([k]) => delivery !== "bubble" || ["single", "truefalse"].includes(k));
  const choice = CHOICE_Q.includes(q.type);
  const toggle = (j: number) => onChange({ ...q, correct: q.type === "multiple" ? (q.correct.includes(j) ? q.correct.filter((n) => n !== j) : [...q.correct, j]) : [j] });
  return (
    <Panel style={styles.card}>
      <View style={styles.head}>
        <AppText variant="bodyStrong" weight="extrabold" style={styles.flex}>{`السؤال ${i + 1}`}</AppText>
        {onMove ? <Button title="↑" variant="ghost" onPress={() => onMove(-1)} accessibilityHint="نقل السؤال للأعلى" /> : null}
        {onMove ? <Button title="↓" variant="ghost" onPress={() => onMove(1)} accessibilityHint="نقل السؤال للأسفل" /> : null}
        {onRemove ? <Button title="حذف" variant="ghost" onPress={onRemove} /> : null}
      </View>
      <Chips label={`نوع السؤال ${i + 1}`} value={q.type} onChange={(t) => onChange(withType(q, t))} items={types.map(([key, label]) => ({ key, label }))} />
      <TextField label="نص السؤال" value={q.prompt} onChangeText={(v) => onChange({ ...q, prompt: v })} multiline maxLength={4000} />
      <TextField label="الدرجة" value={String(q.points || "")} onChangeText={(v) => onChange({ ...q, points: Number(v) || 0 })} keyboardType="decimal-pad" ltr />
      {choice ? (
        <View style={styles.gapSm}>
          <AppText variant="label" weight="bold">{q.type === "multiple" ? "البدائل — اضغط على كل إجابة صحيحة" : "البدائل — اضغط على الإجابة الصحيحة"}</AppText>
          {q.options.map((o, j) => (
            <View key={j} style={styles.optRow}>
              <Pressable accessibilityRole={q.type === "multiple" ? "checkbox" : "radio"} accessibilityState={{ checked: q.correct.includes(j) }} accessibilityLabel={`البديل ${j + 1} صحيح`} onPress={() => toggle(j)} style={[styles.mark, q.correct.includes(j) && styles.markOn]} />
              <View style={styles.flex}>
                {q.type === "truefalse" ? <AppText variant="body">{o}</AppText> : <TextField label={`البديل ${j + 1}`} value={o} onChangeText={(v) => onChange({ ...q, options: q.options.map((x, k) => (k === j ? v : x)) })} maxLength={500} />}
              </View>
              {q.type !== "truefalse" && q.options.length > 2 ? <Button title="×" variant="ghost" accessibilityHint="حذف البديل" onPress={() => onChange({ ...q, options: q.options.filter((_, k) => k !== j), correct: q.correct.filter((n) => n !== j).map((n) => (n > j ? n - 1 : n)) })} /> : null}
            </View>
          ))}
          {q.type !== "truefalse" && q.options.length < 6 ? <Button title="إضافة بديل" variant="secondary" onPress={() => onChange({ ...q, options: [...q.options, ""] })} /> : null}
        </View>
      ) : (
        <TextField label={q.type === "essay" ? "الإجابة النموذجية / نقاط التصحيح" : "الإجابة النموذجية"} value={q.answer} onChangeText={(v) => onChange({ ...q, answer: v })} multiline={q.type === "essay"} maxLength={4000} ltr={q.type === "numeric"} keyboardType={q.type === "numeric" ? "decimal-pad" : undefined} />
      )}
    </Panel>
  );
};

/** إنشاء اختبار كما في المنصة: البيانات، الاستهداف، الأسئلة، ثم حفظ مسودة أو نشر. النماذج تُولَّد في الخادم. */
export const NewTest: React.FC<{ onBack: () => void; onCreated: (id: string, msg: string) => void }> = ({ onBack, onCreated }) => {
  const { active } = useAuth();
  const courses = useLoad(() => fetchMyCourses(active?.schoolId ?? ""), [active?.schoolId]);
  const [f, setF] = useState<ExamForm>({ course_id: "", title: "", instructions: "", delivery: "online", from: null, due: null, duration: "45", count: "1", audience: "all", students: [] });
  const [qs, setQs] = useState<ExamQuestion[]>([blankQuestion()]);
  const [busy, setBusy] = useState<"draft" | "pub" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof ExamForm>(k: K, v: ExamForm[K]) => setF((p) => ({ ...p, [k]: v }));
  const course = courses.data?.find((c) => c.id === f.course_id);
  const scheduled = !!f.from && (riyadhIso(f.from) ?? "") > new Date().toISOString();
  const move = (i: number, d: -1 | 1) => setQs((p) => { const j = i + d; if (j < 0 || j >= p.length) return p; const n = [...p]; [n[i], n[j]] = [n[j]!, n[i]!]; return n; });
  const save = async (publish: boolean) => {
    const e = examFormError(f, qs);
    if (e) return setErr(e);
    setBusy(publish ? "pub" : "draft"); setErr(null);
    try {
      const r = await createExam(examArgs(f, qs), publish);
      onCreated(r.id, !publish ? "حُفظت مسودة الاختبار والأسئلة والنماذج دون نشر" : r.published === "scheduled" ? "جُدول الاختبار وسيظهر للطلاب في وقت البداية" : "نُشر الاختبار وأُبلغ الطلاب وأولياء أمورهم");
    } catch (x) {
      const id = (x as { id?: string }).id;
      if (id) onCreated(id, `حُفظت المسودة لكن تعذر النشر: ${errorText((x as { cause?: unknown }).cause)}`);
      else setErr(errorText(x));
    } finally { setBusy(null); }
  };
  return (
    <SubScreen title="اختبار جديد" eyebrow="إعداد الاختبار ونشره" onBack={onBack}>
      <DataState loading={courses.loading} error={courses.error} empty={!courses.data?.length} emptyTitle="لا توجد مقررات بتكليف ساري لك" emptyHint="يُنشأ الاختبار فقط على مقرر اعتُمد تكليفك به." onRetry={courses.reload}>
        <Panel style={styles.card}>
          <AppText variant="bodyStrong" weight="extrabold">1. بيانات الاختبار</AppText>
          <TextField label="اسم الاختبار" value={f.title} onChangeText={(v) => set("title", v)} maxLength={200} />
          <AppText variant="label" weight="bold">طريقة التقديم</AppText>
          <Chips label="طريقة التقديم" value={f.delivery} onChange={(v) => { set("delivery", v); if (v === "bubble") setQs((p) => p.map((q) => (["single", "truefalse"].includes(q.type) ? q : withType(q, "single")))); }}
            items={(Object.keys(EXAM_DELIVERY) as ExamDelivery[]).map((key) => ({ key, label: EXAM_DELIVERY[key] }))} />
          {f.delivery !== "online" ? <AppText variant="micro" color={COLORS.mutedForeground}>طباعة الأوراق ورصد التظليل من منصة ركاز.</AppText> : null}
          <TextField label="التعليمات" value={f.instructions} onChangeText={(v) => set("instructions", v)} multiline maxLength={8000} />
          <When label="البداية" value={f.from} onChange={(v) => set("from", v)} allowNone="فور النشر" />
          <When label="النهاية" value={f.due} onChange={(v) => set("due", v)} />
          <TextField label="المدة بالدقائق" value={f.duration} onChangeText={(v) => set("duration", v)} keyboardType="number-pad" ltr />
        </Panel>
        <Panel style={styles.card}>
          <AppText variant="bodyStrong" weight="extrabold">2. الاستهداف</AppText>
          <AppText variant="label" weight="bold">المقرر والشعبة</AppText>
          <Chips label="المقرر" value={f.course_id} onChange={(v) => setF((p) => ({ ...p, course_id: v, students: [] }))} items={(courses.data ?? []).map((c) => ({ key: c.id, label: `${c.subject} — ${c.section}` }))} />
          <AudiencePicker course={course} audience={f.audience} students={f.students} onChange={(a, st) => setF((p) => ({ ...p, audience: a, students: st }))} />
        </Panel>
        <View style={styles.head}>
          <AppText variant="bodyStrong" weight="extrabold" style={styles.flex}>{`3. الأسئلة · ${qs.length} · ${examTotal(qs)} درجة`}</AppText>
        </View>
        {qs.map((q, i) => (
          <QuestionEditor key={i} q={q} i={i} delivery={f.delivery} onChange={(n) => setQs((p) => p.map((x, j) => (j === i ? n : x)))}
            onRemove={qs.length > 1 ? () => setQs((p) => p.filter((_, j) => j !== i)) : undefined} onMove={qs.length > 1 ? (d) => move(i, d) : undefined} />
        ))}
        <Button title="إضافة سؤال" variant="secondary" onPress={() => setQs((p) => [...p, blankQuestion()])} />
        <Panel style={styles.card}>
          <AppText variant="bodyStrong" weight="extrabold">4. النماذج</AppText>
          <Chips label="عدد النماذج" value={f.count} onChange={(v) => set("count", v)} items={["1", "2", "3", "4"].map((k) => ({ key: k, label: k === "1" ? "نموذج واحد" : `${k} نماذج` }))} />
          <AppText variant="micro" color={COLORS.mutedForeground}>تُولَّد النماذج بتدوير ترتيب الأسئلة والبدائل، والدرجة الكاملة مجموع درجات الأسئلة، ومحاولة واحدة لكل طالب.</AppText>
        </Panel>
        {err ? <Notice tone="error">{err}</Notice> : null}
        <Button title={scheduled ? "جدولة النشر" : "نشر الآن"} loading={busy === "pub"} disabled={!!busy} onPress={() => void save(true)} />
        <Button title="حفظ مسودة" variant="secondary" loading={busy === "draft"} disabled={!!busy} onPress={() => void save(false)} />
      </DataState>
    </SubScreen>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gapSm: { gap: SPACING.sm },
  card: { paddingVertical: SPACING.md, gap: SPACING.sm },
  head: { flexDirection: "row", alignItems: "center", gap: SPACING.xs },
  optRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  mark: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: COLORS.border },
  markOn: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
});
