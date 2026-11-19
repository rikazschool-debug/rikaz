import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Check, Clock3, Coffee, History, Hourglass, MapPin, UserRound } from "lucide-react-native";
import { AppText } from "../../components/ui";
import { FadeIn } from "../../components/FadeIn";
import { BackHeader, DataState } from "../../components/StudentKit";
import { SBadge, SCard, SCircleButton, SHeader, SPillTabs, SScreen, sStyles } from "../../components/student/SKit";
import { fetchHomework, fetchOverview } from "../../api/student";
import { schoolWeek } from "../../lib/mask";
import { byKind, DAY_NAMES, hm, lessonsOn, riyadhWeekday, schoolTime, SUB_STATUS } from "../../lib/studentData";
import { planDay, riyadhMinutes, summarize, type DayItem } from "../../lib/studentDay";
import { useStudentQuery } from "./useStudentData";
import { R, S, SHADOW } from "../../theme/student";
import { SPACING } from "../../theme/tokens";
import { CalendarDays } from "lucide-react-native";

type Tab = "day" | "week" | "tests";

const STATE_BADGE = { done: { label: "انتهت", tone: "muted" as const }, now: { label: "الآن", tone: "amber" as const }, next: { label: "قادمة", tone: "muted" as const } };

const LessonCard: React.FC<{ item: Extract<DayItem, { kind: "lesson" }> }> = ({ item }) => {
  const { slot: s, state } = item;
  const live = state === "now";
  const pct = Math.round(item.progress * 100);
  return (
    <View style={[st.lesson, live && st.lessonLive]} accessible
      accessibilityLabel={`${s.period}، ${s.subject}${s.teacher ? `، ${s.teacher}` : ""}${s.start ? `، من ${hm(s.start)} إلى ${hm(s.end)}` : ""}${state !== "none" ? `، ${STATE_BADGE[state].label}` : ""}`}>
      <View style={st.lessonRow}>
        <View style={sStyles.flex}>
          <View style={st.meta}>
            {live ? <View style={st.liveDot} /> : null}
            <AppText variant="micro" weight={live ? "bold" : "medium"} color={live ? S.primary : S.text2}>{s.period}</AppText>
          </View>
          <View style={st.subjectRow}>
            <AppText variant="headline" weight="bold" color={S.ink} numberOfLines={2} style={st.shrink}>{s.subject}</AppText>
            {live ? <SBadge label="الآن" tone="amber" /> : null}
          </View>
          {s.teacher ? (
            <View style={st.meta}>
              <UserRound size={15} color={S.secondary} />
              <AppText variant="caption" color={S.text2} numberOfLines={1}>{s.teacher}</AppText>
            </View>
          ) : null}
        </View>
        <View style={[st.time, live && st.timeLive]}>
          {s.start ? (
            <>
              <AppText variant="bodyStrong" weight="bold" color={live ? S.primary : S.ink} style={st.ltr}>{hm(s.start)}</AppText>
              <AppText variant="micro" color={S.text2} style={st.ltr}>{hm(s.end)}</AppText>
            </>
          ) : (
            <Clock3 size={18} color={S.muted} />
          )}
          {state === "done" ? <SBadge label="انتهت" tone="blue" icon={Check} /> : state === "next" ? <SBadge label="قادمة" tone="muted" /> : null}
        </View>
      </View>
      {live ? (
        <>
          <View style={st.remain}>
            <Hourglass size={14} color={S.ink} />
            <AppText variant="micro" color={S.ink}>{`متبقٍ ${item.minutesLeft ?? 0} د`}</AppText>
          </View>
          <View style={st.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: pct }}>
            <View style={[st.fill, { width: `${pct}%` }]} />
          </View>
          <AppText variant="micro" color={S.text2}>{`${pct}% من وقت الحصة`}</AppText>
        </>
      ) : null}
    </View>
  );
};

const BreakCard: React.FC<{ item: Extract<DayItem, { kind: "break" }> }> = ({ item }) => (
  <View style={st.break} accessible accessibilityLabel={`استراحة ${item.minutes} دقيقة من ${hm(item.start)} إلى ${hm(item.end)}`}>
    <View style={st.breakIcon}><Coffee size={18} color={S.amberText} /></View>
    <AppText variant="bodyStrong" weight="bold" color={S.ink} style={sStyles.flex}>استراحة</AppText>
    <AppText variant="micro" color={S.amberText}>{`(${item.minutes} دقيقة)`}</AppText>
    <AppText variant="label" weight="bold" color={S.amberText} style={st.ltr}>{`${hm(item.start)} – ${hm(item.end)}`}</AppText>
  </View>
);

const DayPlan: React.FC<{ items: DayItem[] }> = ({ items }) => (
  <View style={st.list}>
    {items.map((it) => (it.kind === "lesson" ? <LessonCard key={`l-${it.slot.sort}-${it.slot.subject}`} item={it} /> : <BreakCard key={`b-${it.start}`} item={it} />))}
  </View>
);

export const StudentSchedule: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [tab, setTab] = useState<Tab>("day");
  const week = useMemo(() => schoolWeek(new Date()), []);
  const today = riyadhWeekday(new Date());
  const [day, setDay] = useState(today <= 4 ? today : 0);
  const ov = useStudentQuery((_, id) => fetchOverview(id));
  const hw = useStudentQuery((_, id) => fetchHomework(id), [tab === "tests"]);
  const rows = ov.data?.timetable ?? [];
  const tests = byKind(hw.data ?? [], "test").sort((a, b) => a.effective_due.localeCompare(b.effective_due));
  const now = day === today ? riyadhMinutes() : null;
  const dayRows = lessonsOn(rows, day);
  const sum = summarize(dayRows, now);

  return (
    <SScreen topInset={!!onBack}>
      {onBack ? <BackHeader eyebrow={ov.data?.student.name ?? "الجدول"} title="الجدول الدراسي" onBack={onBack} /> : (
        <SHeader eyebrow={ov.data?.student.section ? `جدولي • ${ov.data.student.section}` : "جدولي"} title="الجدول الدراسي"
          action={<SCircleButton icon={CalendarDays} label="عرض الأسبوع" onPress={() => setTab("week")} />} />
      )}
      <SPillTabs label="الجدول" value={tab} onChange={setTab} items={[{ key: "day", label: "اليوم", dot: true }, { key: "week", label: "الأسبوع", dot: true }, { key: "tests", label: "الاختبارات", dot: true }]} />
      {tab === "day" ? (
        <View style={st.days} accessibilityRole="tablist" accessibilityLabel="أيام الأسبوع">
          {week.map((d, i) => {
            const on = i === day;
            return (
              <Pressable key={d.label} onPress={() => setDay(i)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={DAY_NAMES[i]} style={[st.day, on && st.dayOn]}>
                <AppText variant="micro" align="center" color={on ? S.onPrimary : S.text2}>{d.label}</AppText>
                <AppText variant="headline" weight="bold" align="center" color={on ? S.onPrimary : S.ink}>{String(d.day)}</AppText>
                {i === today ? <View style={[st.todayDot, on && { backgroundColor: "#6AD9C4" }]} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <FadeIn key={`${tab}-${day}`}>
        {tab === "tests" ? (
          <DataState loading={hw.loading} error={hw.error} missing={hw.missing} empty={!tests.length} emptyTitle="لا توجد اختبارات مجدولة" onRetry={hw.reload}>
            <View style={st.list}>
              {tests.map((t) => (
                <SCard key={t.id} style={st.testRow}>
                  <View style={sStyles.flex}>
                    <AppText variant="bodyStrong" weight="bold" color={S.ink} numberOfLines={2}>{t.title}</AppText>
                    <AppText variant="micro" color={S.text2}>{`${t.subject} • ${schoolTime(t.effective_due)}`}</AppText>
                  </View>
                  <SBadge label={SUB_STATUS[t.sub_status] ?? t.sub_status} tone={t.sub_status === "none" ? "amber" : "mint"} />
                </SCard>
              ))}
            </View>
          </DataState>
        ) : (
          <DataState loading={ov.loading} error={ov.error} missing={ov.missing} empty={!rows.length} emptyTitle="لا يوجد جدول منشور لشعبتك بعد" emptyHint="يظهر الجدول بعد اعتماده ونشره من إدارة المدرسة." onRetry={ov.reload}>
            {tab === "day" ? (
              <View style={st.dayWrap}>
                <View style={st.dayHead}>
                  <View style={st.headStart}>
                    <AppText variant="bodyStrong" weight="bold" color={S.ink} accessibilityRole="header">جدول اليوم الدراسي</AppText>
                    <SBadge label={`${sum.total} حصص`} tone="mint" />
                  </View>
                  {now !== null && sum.total ? (
                    <View style={st.headStart}>
                      <History size={15} color={S.secondary} />
                      <AppText variant="micro" color={S.text2}>{`متبقٍ ${sum.remaining} حصص`}</AppText>
                    </View>
                  ) : null}
                </View>
                {dayRows.length ? <DayPlan items={planDay(dayRows, now)} /> : <DataState empty emptyTitle="لا توجد حصص في هذا اليوم" />}
              </View>
            ) : (
              <View style={st.weekList}>
                {[0, 1, 2, 3, 4].map((d) => {
                  const r = lessonsOn(rows, d);
                  return (
                    <View key={d} style={st.dayWrap}>
                      <View style={st.headStart}>
                        <AppText variant="bodyStrong" weight="bold" accessibilityRole="header" color={d === today ? S.primary : S.ink}>{DAY_NAMES[d]}</AppText>
                        <SBadge label={`${r.length} حصص`} tone={d === today ? "mint" : "muted"} />
                      </View>
                      {r.length ? <DayPlan items={planDay(r, d === today ? riyadhMinutes() : null)} /> : <DataState empty emptyTitle="لا توجد حصص في هذا اليوم" />}
                    </View>
                  );
                })}
              </View>
            )}
          </DataState>
        )}
      </FadeIn>
      {tab === "day" && ov.data && !onBack ? (
        <View style={st.hint}><MapPin size={14} color={S.muted} /><AppText variant="micro" color={S.muted}>المواعيد بتوقيت المدرسة كما نشرتها الإدارة.</AppText></View>
      ) : null}
    </SScreen>
  );
};

const st = StyleSheet.create({
  shrink: { flexShrink: 1 },
  ltr: { writingDirection: "ltr" },
  days: { flexDirection: "row", gap: SPACING.sm },
  day: { flex: 1, backgroundColor: S.surface, borderRadius: R.tile + 2, paddingVertical: SPACING.md, minHeight: 84, alignItems: "center", justifyContent: "center", ...SHADOW.l1 },
  dayOn: { backgroundColor: S.primary, ...SHADOW.l2 },
  todayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: S.primary, marginTop: 4 },
  dayWrap: { gap: SPACING.md },
  dayHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: SPACING.sm },
  headStart: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  list: { gap: SPACING.md },
  lesson: { backgroundColor: S.surface, borderRadius: R.card, padding: SPACING.lg, gap: SPACING.sm, borderWidth: 1, borderColor: S.hairline, ...SHADOW.l1 },
  lessonLive: { backgroundColor: "#D9F6EE", borderColor: S.mintStrong, borderStartWidth: 5, borderStartColor: S.primary, ...SHADOW.l2 },
  lessonRow: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  meta: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: S.primary },
  subjectRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, flexWrap: "wrap" },
  time: { alignItems: "center", gap: 4, minWidth: 64 },
  timeLive: { backgroundColor: S.surface, borderRadius: 32, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md },
  remain: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-end" },
  track: { height: 6, borderRadius: 3, backgroundColor: "rgba(15,81,69,0.12)", overflow: "hidden" },
  fill: { height: 6, borderRadius: 3, backgroundColor: S.primary },
  break: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, backgroundColor: "#FDEBDD", borderRadius: R.card, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  breakIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: S.surface, alignItems: "center", justifyContent: "center" },
  testRow: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  weekList: { gap: SPACING.xl },
  hint: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center" },
});
