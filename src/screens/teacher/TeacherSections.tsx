import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText, Button, Notice, TextField } from "../../components/ui";
import { Chips, DataState, Panel, Pill, SegmentTabs, SubScreen } from "../../components/StudentKit";
import {
  ackDuty, approveLesson, execDuty, fetchEdu, fetchLesson, fetchMyDuties, fetchMyLessons, fetchMyMeetings, fetchMyTasks, fetchMyTimetable,
  fetchTeacherHomework, openLesson, saveLesson, type Duty, type Lesson,
} from "../../api/teacher";
import { useAuth } from "../../hooks/useAuth";
import { errorText, useLoad } from "../../hooks/useLoad";
import { DAY_NAMES, hm, riyadhToday, riyadhWeekday, schoolDate, schoolTime } from "../../lib/studentData";
import {
  changedMarks, countMarks, DUTY_STATUS, dutyActions, EDU_STATUS, EDU_TITLE, EXEC_STATUS, HW_STATUS, LESSON_STATUS, MARK_LABEL, MARK_ORDER,
  MEETING_STATUS, nextMark, PRIORITY, slotsByDay, TASK_STATUS, type EduKind, type MarkStatus,
} from "../../lib/teacherData";
import { COLORS, SPACING } from "../../theme/tokens";
import { HomeworkDetail } from "../shared/HomeworkDetail";

const addDays = (d: string, n: number) => new Date(Date.parse(d + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const MARK_TONE: Record<MarkStatus, "success" | "danger" | "accent" | "muted"> = { present: "success", absent: "danger", late: "accent", excused: "muted" };

/* ---------- حصص اليوم ---------- */
export const LessonCard: React.FC<{ l: Lesson; onOpen: (l: Lesson) => void; first?: boolean }> = ({ l, onOpen, first }) => (
  <Pressable accessibilityRole="button" accessibilityLabel={`${l.subject} ${l.section}`} onPress={() => onOpen(l)} style={({ pressed }) => [styles.row, !first && styles.border, pressed && { opacity: 0.8 }]}>
    <View style={styles.time}><AppText variant="label" weight="extrabold" color={COLORS.primary}>{hm(l.start)}</AppText><AppText variant="micro" color={COLORS.mutedForeground}>{l.period}</AppText></View>
    <View style={styles.flex}>
      <AppText variant="bodyStrong" numberOfLines={1}>{l.kind === "daily" ? "التحضير اليومي" : l.subject}</AppText>
      <AppText variant="micro" color={COLORS.mutedForeground} numberOfLines={1}>{`${l.section}${l.substitute ? " · حصة بديلة" : ""}${l.absent ? ` · ${l.absent} غائب` : ""}${l.late ? ` · ${l.late} متأخر` : ""}`}</AppText>
    </View>
    <Pill label={LESSON_STATUS[l.status ?? "none"] ?? "لم يُرصد"} tone={l.status === "approved" ? "success" : l.status === "draft" ? "accent" : "muted"} />
  </Pressable>
);

export const TodayLessons: React.FC<{ onBack?: () => void; embedded?: boolean; onOpen: (l: Lesson) => void }> = ({ onBack, embedded, onOpen }) => {
  const today = riyadhToday();
  const q = useLoad(() => fetchMyLessons(today), [today]);
  const body = (
    <DataState loading={q.loading} error={q.error} empty={!q.data?.length} emptyTitle="لا توجد حصص لك اليوم" onRetry={q.reload}>
      <Panel>{(q.data ?? []).map((l, i) => <LessonCard key={l.slot_id + (l.kind ?? "")} l={l} first={i === 0} onOpen={onOpen} />)}</Panel>
    </DataState>
  );
  if (embedded) return body;
  return <SubScreen title="تحضير الحصص" eyebrow={schoolDate(today)} onBack={onBack} refreshing={q.loading} onRefresh={q.reload}>{body}</SubScreen>;
};

/** رصد حضور حصة: المسودة تبدأ بالجميع حاضرين، المعلم يغيّر ثم يعتمد — القواعد كلها في دوال la_* بالخادم. */
export const LessonAttendance: React.FC<{ lesson: Lesson; onBack: () => void }> = ({ lesson, onBack }) => {
  const today = riyadhToday();
  const [id, setId] = useState<string | null>(lesson.session_id);
  const [openErr, setOpenErr] = useState<string | null>(null);
  useEffect(() => {
    if (id) return;
    openLesson(lesson.slot_id, today).then(setId).catch((e) => setOpenErr(errorText(e)));
  }, [id, lesson.slot_id, today]);
  const q = useLoad(() => (id ? fetchLesson(id) : Promise.resolve(null)), [id]);
  const [marks, setMarks] = useState<Record<string, MarkStatus>>({});
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  useEffect(() => { if (q.data) setMarks(Object.fromEntries(q.data.marks.map((m) => [m.student_id, m.status]))); }, [q.data]);
  const d = q.data;
  const counts = useMemo(() => countMarks(marks), [marks]);
  const changes = d ? changedMarks(d.marks, marks) : [];
  const approved = d?.status === "approved";

  async function run(approve: boolean) {
    if (!d) return;
    if (approved && changes.length && !reason.trim()) { setMsg({ tone: "error", text: "اكتب سبب التعديل بعد الاعتماد" }); return; }
    setBusy(true); setMsg(null);
    try {
      let rev = d.rev;
      if (changes.length) rev = await saveLesson(d.id, d.rev, changes, approved ? reason.trim() : null);
      if (approve && !approved) await approveLesson(d.id, rev);
      setMsg({ tone: "success", text: approve ? "اعتُمد التحضير" : "حُفظت التغييرات" }); setReason(""); q.reload();
    } catch (e) { setMsg({ tone: "error", text: errorText(e) }); } finally { setBusy(false); }
  }

  return (
    <SubScreen title={lesson.kind === "daily" ? "التحضير اليومي" : lesson.subject} eyebrow={`${lesson.section} · ${lesson.period}`} onBack={onBack} refreshing={q.loading} onRefresh={q.reload}>
      {openErr ? <Notice tone="error">{openErr}</Notice> : null}
      <DataState loading={!openErr && (!id || q.loading) && !d} error={q.error} empty={!!d && !d.marks.length} emptyTitle="لا يوجد طلاب في هذه الشعبة" onRetry={q.reload}>
        {d ? (
          <>
            <View style={styles.stats}>
              {MARK_ORDER.map((k) => <View key={k} style={styles.stat}><AppText variant="headline" weight="extrabold" color={COLORS.primary}>{counts[k]}</AppText><AppText variant="micro" color={COLORS.mutedForeground}>{MARK_LABEL[k]}</AppText></View>)}
            </View>
            <Notice tone={approved ? "success" : "info"}>{approved ? "التحضير معتمد. أي تعديل الآن يحتاج سببًا ويُسجّل في السجل." : "الجميع حاضر افتراضيًا. المس اسم الطالب لتغيير حالته ثم اعتمد."}</Notice>
            <Panel>
              {d.marks.map((m, i) => {
                const s = marks[m.student_id] ?? m.status;
                return (
                  <Pressable key={m.student_id} disabled={!d.can_edit || busy} accessibilityRole="button" accessibilityLabel={`${m.name}: ${MARK_LABEL[s]}`} accessibilityHint="المس لتغيير الحالة"
                    onPress={() => setMarks((x) => ({ ...x, [m.student_id]: nextMark(s) }))} style={({ pressed }) => [styles.row, i > 0 && styles.border, pressed && { opacity: 0.75 }]}>
                    <AppText variant="bodyStrong" style={styles.flex} numberOfLines={1}>{m.name}</AppText>
                    <Pill label={MARK_LABEL[s]} tone={MARK_TONE[s]} />
                  </Pressable>
                );
              })}
            </Panel>
            {approved && changes.length ? <TextField label="سبب التعديل" value={reason} onChangeText={setReason} /> : null}
            {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
            {d.can_edit ? (
              <View style={styles.actions}>
                {!approved ? <Button title="اعتماد التحضير" loading={busy} onPress={() => void run(true)} /> : null}
                {changes.length ? <Button title={`حفظ ${changes.length} تغيير`} variant="secondary" disabled={busy} onPress={() => void run(false)} /> : null}
              </View>
            ) : <Notice tone="info">لا يمكنك تعديل هذا التحضير.</Notice>}
          </>
        ) : null}
      </DataState>
    </SubScreen>
  );
};

/* ---------- جدولي ---------- */
export const TeacherSchedule: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { active } = useAuth();
  const today = riyadhToday();
  const q = useLoad(() => fetchMyTimetable(active?.schoolId ?? "", today), [active?.schoolId, today]);
  const byDay = useMemo(() => slotsByDay(q.data ?? []), [q.data]);
  const days = [...byDay.keys()];
  const wd = riyadhWeekday(new Date());
  const [day, setDay] = useState<string>("");
  useEffect(() => { if (days.length && !days.includes(Number(day))) setDay(String(days.includes(wd) ? wd : days[0])); }, [days.join(","), wd]);
  const rows = byDay.get(Number(day)) ?? [];
  return (
    <SubScreen title="جدولي" eyebrow="الجدول المنشور الساري" onBack={onBack} refreshing={q.loading} onRefresh={q.reload}>
      <DataState loading={q.loading} error={q.error} empty={!q.data?.length} emptyTitle="لا توجد حصص لك في الجدول المنشور" onRetry={q.reload}>
        <Chips label="الأيام" value={day} onChange={setDay} items={days.map((d) => ({ key: String(d), label: DAY_NAMES[d] ?? "" }))} />
        <AppText variant="caption" color={COLORS.mutedForeground}>{`${q.data?.length ?? 0} حصة أسبوعيًا · ${rows.length} في هذا اليوم`}</AppText>
        <Panel>
          {rows.map((s, i) => (
            <View key={s.id} style={[styles.row, i > 0 && styles.border]}>
              <View style={styles.time}><AppText variant="label" weight="extrabold" color={COLORS.primary}>{hm(s.start)}</AppText><AppText variant="micro" color={COLORS.mutedForeground}>{s.period}</AppText></View>
              <View style={styles.flex}>
                <AppText variant="bodyStrong" numberOfLines={1}>{s.subject}</AppText>
                <AppText variant="micro" color={COLORS.mutedForeground} numberOfLines={1}>{[s.section, s.room].filter((x) => x.trim()).join(" · ")}</AppText>
              </View>
            </View>
          ))}
        </Panel>
      </DataState>
    </SubScreen>
  );
};

/* ---------- الواجبات والاختبارات ---------- */
export const TeacherHomework: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { active } = useAuth();
  const [kind, setKind] = useState<"homework" | "test">("homework");
  const [open, setOpen] = useState<string | null>(null);
  const q = useLoad(() => fetchTeacherHomework(active?.schoolId ?? "", kind), [active?.schoolId, kind, open]);
  if (open) return <HomeworkDetail id={open} role="teacher" onBack={() => setOpen(null)} />;
  return (
    <SubScreen title="الواجبات والاختبارات" eyebrow="ما أنشأته لطلابك" onBack={onBack} refreshing={q.loading} onRefresh={q.reload}>
      <SegmentTabs label="النوع" value={kind} onChange={setKind} items={[{ key: "homework", label: "الواجبات" }, { key: "test", label: "الاختبارات" }]} />
      <DataState loading={q.loading} error={q.error} empty={!q.data?.length} emptyTitle={kind === "test" ? "لا توجد اختبارات" : "لا توجد واجبات"} onRetry={q.reload}>
        <View style={styles.list}>
          {(q.data ?? []).map((h) => (
            <Pressable key={h.id} accessibilityRole="button" accessibilityLabel={h.title} onPress={() => setOpen(h.id)}>
            <Panel style={styles.card}>
              <View style={styles.head}><AppText variant="bodyStrong" weight="extrabold" style={styles.flex} numberOfLines={2}>{h.title}</AppText><Pill label={HW_STATUS[h.status] ?? h.status} tone={h.status === "published" ? "success" : "muted"} /></View>
              <AppText variant="micro" color={COLORS.mutedForeground}>{[h.subject, h.section, h.due_at ? `التسليم ${schoolTime(h.due_at)}` : null].filter(Boolean).join(" · ")}</AppText>
              <AppText variant="caption">{`سلّم ${h.submitted ?? 0} من ${h.targets ?? 0}${h.late ? ` · متأخر ${h.late}` : ""}${h.to_grade ? ` · بانتظار التصحيح ${h.to_grade}` : ""}`}</AppText>
            </Panel>
            </Pressable>
          ))}
        </View>
      </DataState>
    </SubScreen>
  );
};

/* ---------- التكليفات ---------- */
export const TeacherTasks: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { active } = useAuth();
  const q = useLoad(() => fetchMyTasks(active?.schoolId ?? ""), [active?.schoolId]);
  return (
    <SubScreen title="التكليفات" eyebrow="المسندة إليك" onBack={onBack} refreshing={q.loading} onRefresh={q.reload}>
      <DataState loading={q.loading} error={q.error} empty={!q.data?.length} emptyTitle="لا توجد تكليفات مسندة إليك" onRetry={q.reload}>
        <View style={styles.list}>
          {(q.data ?? []).map((t) => (
            <Panel key={t.id} style={styles.card}>
              <View style={styles.head}><AppText variant="bodyStrong" weight="extrabold" style={styles.flex} numberOfLines={2}>{t.title}</AppText><Pill label={TASK_STATUS[t.status] ?? t.status} tone={t.status === "done" ? "success" : t.status === "returned" ? "danger" : "primary"} /></View>
              <AppText variant="micro" color={COLORS.mutedForeground}>{[t.assigner_name ? `من ${t.assigner_name}` : null, `الأولوية ${PRIORITY[t.priority] ?? t.priority}`, t.due_date ? `الاستحقاق ${t.due_date}` : null].filter(Boolean).join(" · ")}</AppText>
              {t.progress != null ? <View style={styles.bar}><View style={[styles.fill, { width: `${Math.max(0, Math.min(100, t.progress))}%` }]} /></View> : null}
            </Panel>
          ))}
        </View>
      </DataState>
    </SubScreen>
  );
};

/* ---------- المناوبات ---------- */
export const TeacherDuties: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { active } = useAuth();
  const today = riyadhToday();
  const q = useLoad(() => fetchMyDuties(active?.schoolId ?? "", addDays(today, -7), addDays(today, 30)), [active?.schoolId, today]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});
  async function act(d: Duty, fn: () => Promise<unknown>) {
    setBusy(d.id); setErr(null);
    try { await fn(); q.reload(); } catch (e) { setErr(errorText(e)); } finally { setBusy(null); }
  }
  return (
    <SubScreen title="المناوبات" eyebrow="مناوباتي" onBack={onBack} refreshing={q.loading} onRefresh={q.reload}>
      {err ? <Notice tone="error">{err}</Notice> : null}
      <DataState loading={q.loading} error={q.error} empty={!q.data?.length} emptyTitle="لا توجد مناوبات" emptyHint="ستظهر مناوباتك هنا بعد نشر الجدول." onRetry={q.reload}>
        <View style={styles.list}>
          {(q.data ?? []).map((d) => {
            const a = dutyActions(d, today);
            return (
              <Panel key={d.id} style={styles.card}>
                <View style={styles.head}><AppText variant="bodyStrong" weight="extrabold" style={styles.flex}>{d.post}</AppText><Pill label={DUTY_STATUS[d.status] ?? d.status} tone={d.status === "assigned" ? "success" : "muted"} /></View>
                <AppText variant="micro" color={COLORS.mutedForeground}>{`${schoolDate(d.date)} · ${hm(d.start_time)}–${hm(d.end_time)}${d.substitute ? " · بديل" : ""}`}</AppText>
                {d.status === "assigned" ? <AppText variant="caption">{`${EXEC_STATUS[d.exec_status] ?? d.exec_status} · ${d.ack_at ? "اطّلعت" : "لم تطّلع بعد"}`}</AppText> : null}
                {d.cancel_reason ? <AppText variant="caption" color={COLORS.mutedForeground}>{`السبب: ${d.cancel_reason}`}</AppText> : null}
                {a.ack ? <Button title="إقرار الاستلام" loading={busy === d.id} onPress={() => void act(d, () => ackDuty(d.id))} /> : null}
                {a.exec ? (
                  <>
                    <TextField label="ملاحظة التنفيذ" value={note[d.id] ?? ""} onChangeText={(v) => setNote((x) => ({ ...x, [d.id]: v }))} />
                    <View style={styles.actions}>
                      <Button title="نُفذت" variant="secondary" disabled={busy === d.id} onPress={() => void act(d, () => execDuty(d, true, note[d.id] ?? ""))} />
                      <Button title="تعذر التنفيذ" variant="secondary" disabled={busy === d.id || !(note[d.id] ?? "").trim()} onPress={() => void act(d, () => execDuty(d, false, note[d.id] ?? ""))} />
                    </View>
                  </>
                ) : null}
              </Panel>
            );
          })}
        </View>
      </DataState>
    </SubScreen>
  );
};

/* ---------- الاجتماعات ---------- */
export const TeacherMeetings: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { active } = useAuth();
  const q = useLoad(() => fetchMyMeetings(active?.schoolId ?? ""), [active?.schoolId]);
  return (
    <SubScreen title="الاجتماعات" eyebrow="اجتماعاتي" onBack={onBack} refreshing={q.loading} onRefresh={q.reload}>
      <DataState loading={q.loading} error={q.error} empty={!q.data?.length} emptyTitle="لا توجد اجتماعات" onRetry={q.reload}>
        <View style={styles.list}>
          {(q.data ?? []).map((m) => (
            <Panel key={m.id} style={styles.card}>
              <View style={styles.head}><AppText variant="bodyStrong" weight="extrabold" style={styles.flex} numberOfLines={2}>{m.title}</AppText><Pill label={MEETING_STATUS[m.status] ?? m.status} tone={m.status === "scheduled" ? "primary" : m.status === "cancelled" ? "danger" : "muted"} /></View>
              <AppText variant="micro" color={COLORS.mutedForeground}>{[schoolTime(m.starts_at), m.duration_min ? `${m.duration_min} د` : null, m.mode === "virtual" ? "افتراضي" : m.location || "حضوري"].filter(Boolean).join(" · ")}</AppText>
              {m.organizer_name ? <AppText variant="caption">{`المنظم: ${m.organizer_name}`}</AppText> : null}
            </Panel>
          ))}
        </View>
      </DataState>
    </SubScreen>
  );
};

/* ---------- التوجيه/الموهوبين/الخطط/الإشراف ---------- */
export const EduRecords: React.FC<{ kind: EduKind; onBack: () => void; eyebrow?: string }> = ({ kind, onBack, eyebrow }) => {
  const { active } = useAuth();
  const q = useLoad(() => fetchEdu(active?.schoolId ?? "", kind), [active?.schoolId, kind]);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <SubScreen title={EDU_TITLE[kind]} eyebrow={eyebrow ?? "السجلات المتاحة لك"} onBack={onBack} refreshing={q.loading} onRefresh={q.reload}>
      <DataState loading={q.loading} error={q.error} empty={!q.data?.length} emptyTitle="لا توجد سجلات" onRetry={q.reload}>
        <View style={styles.list}>
          {(q.data ?? []).map((r) => (
            <Pressable key={r.id} accessibilityRole="button" onPress={() => setOpen(open === r.id ? null : r.id)}>
              <Panel style={styles.card}>
                <View style={styles.head}><AppText variant="bodyStrong" weight="extrabold" style={styles.flex} numberOfLines={2}>{r.title || r.person}</AppText><Pill label={EDU_STATUS[r.status] ?? r.status} tone={r.status === "completed" || r.status === "closed" ? "success" : "primary"} /></View>
                <AppText variant="micro" color={COLORS.mutedForeground}>{[r.person, r.course, r.record_date, r.goals?.length ? `${r.goals_done ?? 0}/${r.goals.length} أهداف` : null].filter(Boolean).join(" · ")}</AppText>
                {open === r.id ? (
                  <View style={styles.list}>
                    {r.description ? <AppText variant="caption">{r.description}</AppText> : null}
                    {r.goals?.map((g, i) => <AppText key={i} variant="caption">{`${i + 1}. ${g}`}</AppText>)}
                    {r.actions ? <AppText variant="caption" color={COLORS.mutedForeground}>{r.actions}</AppText> : null}
                  </View>
                ) : null}
              </Panel>
            </Pressable>
          ))}
        </View>
      </DataState>
    </SubScreen>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { gap: SPACING.sm },
  card: { paddingVertical: SPACING.md, gap: SPACING.xs },
  head: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  row: { flexDirection: "row", alignItems: "center", gap: SPACING.md, paddingVertical: SPACING.md, minHeight: 52 },
  border: { borderTopWidth: 1, borderTopColor: COLORS.border },
  time: { width: 56, alignItems: "center" },
  stats: { flexDirection: "row", gap: SPACING.sm },
  stat: { flex: 1, alignItems: "center", backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingVertical: SPACING.sm },
  actions: { gap: SPACING.sm },
  bar: { height: 6, borderRadius: 3, backgroundColor: COLORS.muted, overflow: "hidden", marginTop: SPACING.xs },
  fill: { height: 6, backgroundColor: COLORS.primary },
});
