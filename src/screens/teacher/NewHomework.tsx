import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText, Button, Notice, TextField } from "../../components/ui";
import { Chips, DataState, Panel, SubScreen } from "../../components/StudentKit";
import { createHomework, fetchMyCourses, fetchRoster, type MyCourse } from "../../api/teacher";
import { useAuth } from "../../hooks/useAuth";
import { errorText, useLoad } from "../../hooks/useLoad";
import { DAY_NAMES, riyadhToday } from "../../lib/studentData";
import { criteriaTotal, hwFormError, hwPayload, nextDays, riyadhIso, type HwForm } from "../../lib/homeworkRules";
import { COLORS, SPACING } from "../../theme/tokens";

const TYPES: [string, string][] = [["text", "نص"], ["file", "ملفات"], ["link", "رابط"], ["paper", "ورقي"]];
const LATE: [HwForm["late_policy"], string][] = [["none", "لا يُقبل التأخر"], ["allow", "حتى إغلاق التسليم"], ["until", "حتى موعد إضافي"]];
const TIMES = ["07:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00", "23:59"];
const short = (d: string) => DAY_NAMES[new Date(d + "T00:00:00Z").getUTCDay()] ?? "";

/** اختيار موعد بتوقيت المدرسة: يوم من الأسابيع الثلاثة القادمة ثم ساعة. */
export const When: React.FC<{ label: string; value: { d: string; t: string } | null; onChange: (v: { d: string; t: string } | null) => void; allowNone?: string }> = ({ label, value, onChange, allowNone }) => {
  const days = nextDays(riyadhToday(), 21);
  return (
    <View style={styles.gapSm}>
      <AppText variant="label" weight="bold">{label}</AppText>
      <Chips label={label} value={value?.d ?? "none"} onChange={(d) => onChange(d === "none" ? null : { d, t: value?.t ?? "23:59" })}
        items={[...(allowNone ? [{ key: "none", label: allowNone }] : []), ...days.map((d, i) => ({ key: d, label: i === 0 ? "اليوم" : i === 1 ? "غدًا" : `${short(d)} ${d.slice(8)}/${d.slice(5, 7)}` }))]} />
      {value ? <Chips label={`${label} — الساعة`} value={value.t} onChange={(t) => onChange({ d: value.d, t })} items={TIMES.map((t) => ({ key: t, label: t }))} /> : null}
    </View>
  );
};

export const Toggle: React.FC<{ on: boolean; label: string; onPress: () => void }> = ({ on, label, onPress }) => (
  <Pressable accessibilityRole="switch" accessibilityState={{ checked: on }} onPress={onPress} style={[styles.toggle, on && styles.toggleOn]}>
    <View style={[styles.box, on && styles.boxOn]} />
    <AppText variant="body" style={styles.flex}>{label}</AppText>
  </Pressable>
);

/** المستهدفون: كل الشعبة أو طلاب محددون من قائمة الشعبة النشطة. */
export const AudiencePicker: React.FC<{ course: MyCourse | undefined; audience: "all" | "selected"; students: string[]; onChange: (a: "all" | "selected", s: string[]) => void }> = ({ course, audience, students, onChange }) => {
  const roster = useLoad(() => (course && audience === "selected" ? fetchRoster(course) : Promise.resolve([])), [course?.id, audience]);
  return (
    <View style={styles.gapSm}>
      <AppText variant="label" weight="bold">المستهدفون</AppText>
      <Chips label="المستهدفون" value={audience} onChange={(a) => onChange(a, a === "all" ? [] : students)} items={[{ key: "all", label: "جميع طلاب الشعبة" }, { key: "selected", label: "طلاب محددون" }]} />
      {audience === "selected" ? (
        !course ? <AppText variant="micro" color={COLORS.mutedForeground}>اختر المقرر أولًا لعرض الطلاب.</AppText> : (
          <DataState loading={roster.loading} error={roster.error} empty={!roster.data?.length} emptyTitle="لا يوجد طلاب نشطون في الشعبة" onRetry={roster.reload}>
            <AppText variant="micro" color={COLORS.mutedForeground}>{`اختير ${students.length} من ${roster.data?.length ?? 0}`}</AppText>
            <View style={styles.wrap}>
              {(roster.data ?? []).map((r) => <Toggle key={r.id} on={students.includes(r.id)} label={r.name} onPress={() => onChange("selected", students.includes(r.id) ? students.filter((x) => x !== r.id) : [...students, r.id])} />)}
            </View>
          </DataState>
        )
      ) : null}
    </View>
  );
};

export const NewHomework: React.FC<{ onBack: () => void; onCreated: (id: string, msg: string) => void }> = ({ onBack, onCreated }) => {
  const { active } = useAuth();
  const courses = useLoad(() => fetchMyCourses(active?.schoolId ?? ""), [active?.schoolId]);
  const [f, setF] = useState<HwForm>({ course_id: "", title: "", instructions: "", types: ["text"], from: null, due: null, late_policy: "none", late_until: null, graded: true, max_score: "10", allow_resubmit: false, max_attempts: "2", audience: "all", students: [], criteria: [] });
  const set = <K extends keyof HwForm>(k: K, v: HwForm[K]) => setF((p) => ({ ...p, [k]: v }));
  const [busy, setBusy] = useState<"draft" | "pub" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const course = courses.data?.find((c) => c.id === f.course_id);
  const crit = f.criteria ?? [];
  const setCrit = (i: number, k: "label" | "max", v: string) => set("criteria", crit.map((c, j) => (j === i ? { ...c, [k]: v } : c)));
  const scheduled = !!f.from && (riyadhIso(f.from) ?? "") > new Date().toISOString();
  const save = async (publish: boolean) => {
    const e = hwFormError(f);
    if (e) return setErr(e);
    setBusy(publish ? "pub" : "draft"); setErr(null);
    try {
      const r = await createHomework(hwPayload(f), publish);
      onCreated(r.id, !publish ? "حُفظت المسودة (لم يُرسل أي إشعار)" : r.published === "scheduled" ? "جُدول الواجب وسيظهر للطلاب في وقت الإتاحة" : "نُشر الواجب وأُبلغ الطلاب وأولياء أمورهم");
    } catch (x) {
      const id = (x as { id?: string }).id;
      if (id) onCreated(id, `حُفظت المسودة لكن تعذر النشر: ${errorText((x as { cause?: unknown }).cause)}`);
      else setErr(errorText(x));
    } finally { setBusy(null); }
  };
  return (
    <SubScreen title="واجب جديد" eyebrow="إعداد الواجب ونشره" onBack={onBack}>
      <DataState loading={courses.loading} error={courses.error} empty={!courses.data?.length} emptyTitle="لا توجد مقررات بتكليف ساري لك" emptyHint="يُنشأ الواجب فقط على مقرر اعتُمد تكليفك به." onRetry={courses.reload}>
        <Panel style={styles.card}>
          <AppText variant="bodyStrong" weight="extrabold">1. البيانات الأساسية</AppText>
          <AppText variant="label" weight="bold">المقرر</AppText>
          <Chips label="المقرر" value={f.course_id} onChange={(v) => setF((p) => ({ ...p, course_id: v, students: [] }))} items={(courses.data ?? []).map((c) => ({ key: c.id, label: `${c.subject} — ${c.section}` }))} />
          <TextField label="العنوان" value={f.title} onChangeText={(v) => set("title", v)} maxLength={200} />
          <TextField label="التعليمات" value={f.instructions} onChangeText={(v) => set("instructions", v)} multiline maxLength={8000} placeholder="المطلوب، وطريقة الحل، وشكل التسليم" />
          <AudiencePicker course={course} audience={f.audience ?? "all"} students={f.students ?? []} onChange={(a, st) => setF((p) => ({ ...p, audience: a, students: st }))} />
        </Panel>
        <Panel style={styles.card}>
          <AppText variant="bodyStrong" weight="extrabold">2. التسليم والمواعيد</AppText>
          <AppText variant="label" weight="bold">طريقة التسليم</AppText>
          <View style={styles.wrap}>{TYPES.map(([k, l]) => <Toggle key={k} on={f.types.includes(k)} label={l} onPress={() => set("types", f.types.includes(k) ? f.types.filter((x) => x !== k) : [...f.types, k])} />)}</View>
          <When label="الإتاحة للطلاب" value={f.from} onChange={(v) => set("from", v)} allowNone="فور النشر" />
          <When label="موعد التسليم" value={f.due} onChange={(v) => set("due", v)} />
          <AppText variant="label" weight="bold">التأخر</AppText>
          <Chips label="التأخر" value={f.late_policy} onChange={(v) => set("late_policy", v)} items={LATE.map(([key, label]) => ({ key, label }))} />
          {f.late_policy === "until" ? <When label="آخر موعد للتأخر" value={f.late_until} onChange={(v) => set("late_until", v)} /> : null}
          <Toggle on={f.allow_resubmit} label="السماح بإعادة التسليم" onPress={() => set("allow_resubmit", !f.allow_resubmit)} />
          {f.allow_resubmit ? <TextField label="عدد المحاولات" value={f.max_attempts} onChangeText={(v) => set("max_attempts", v)} keyboardType="number-pad" ltr /> : null}
        </Panel>
        <Panel style={styles.card}>
          <AppText variant="bodyStrong" weight="extrabold">3. التقييم</AppText>
          <Toggle on={f.graded} label="واجب بدرجة" onPress={() => set("graded", !f.graded)} />
          {f.graded ? <TextField label="الدرجة الكاملة" value={f.max_score} onChangeText={(v) => set("max_score", v)} keyboardType="decimal-pad" ltr /> : null}
          {f.graded ? (
            <View style={styles.gapSm}>
              <AppText variant="label" weight="bold">معايير التصحيح (اختياري)</AppText>
              {crit.map((c, i) => (
                <View key={i} style={styles.critRow}>
                  <View style={styles.flex}><TextField label={`المعيار ${i + 1}`} value={c.label} onChangeText={(v) => setCrit(i, "label", v)} maxLength={120} /></View>
                  <View style={styles.critMax}><TextField label="الدرجة" value={c.max} onChangeText={(v) => setCrit(i, "max", v)} keyboardType="decimal-pad" ltr /></View>
                  <Button title="حذف" variant="ghost" onPress={() => set("criteria", crit.filter((_, j) => j !== i))} />
                </View>
              ))}
              {crit.length ? <AppText variant="micro" color={criteriaTotal(crit.map((c) => c.max)) === Number(f.max_score) ? COLORS.primary : COLORS.destructive}>{`المجموع ${criteriaTotal(crit.map((c) => c.max))} من ${f.max_score}`}</AppText> : null}
              {crit.length < 10 ? <Button title="إضافة معيار" variant="secondary" onPress={() => set("criteria", [...crit, { label: "", max: "" }])} /> : null}
              <AppText variant="micro" color={COLORS.mutedForeground}>المعايير ثابتة بعد إسناد الواجب للطلاب.</AppText>
            </View>
          ) : null}
        </Panel>
        {err ? <Notice tone="error">{err}</Notice> : null}
        <Button title={scheduled ? "جدولة النشر" : "نشر الآن"} loading={busy === "pub"} disabled={!!busy || !f.course_id} onPress={() => void save(true)} />
        <Button title="حفظ مسودة" variant="secondary" loading={busy === "draft"} disabled={!!busy || !f.course_id} onPress={() => void save(false)} />
      </DataState>
    </SubScreen>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gapSm: { gap: SPACING.sm },
  critRow: { flexDirection: "row", alignItems: "flex-end", gap: SPACING.sm },
  critMax: { width: 84 },
  card: { paddingVertical: SPACING.md, gap: SPACING.sm },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  toggle: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, minHeight: 44, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: SPACING.md, flexGrow: 1 },
  toggleOn: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryTint },
  box: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: COLORS.border },
  boxOn: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
});
