import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Clock, UserRound } from "lucide-react-native";
import { AppText } from "../../components/ui";
import { FadeIn } from "../../components/FadeIn";
import { DataState, Panel, Pill, ScreenTitle, SegmentTabs, studentStyles } from "../../components/StudentKit";
import { fetchHomework, fetchOverview } from "../../api/student";
import { schoolWeek } from "../../lib/mask";
import { byKind, DAY_NAMES, hm, lessonsOn, riyadhWeekday, schoolTime, SUB_STATUS, type Slot } from "../../lib/studentData";
import { useStudentQuery } from "./useStudentData";
import { COLORS, SPACING } from "../../theme/tokens";

type Tab = "day" | "week" | "tests";

const Lesson: React.FC<{ s: Slot; first: boolean }> = ({ s, first }) => (
  <View style={[styles.lesson, !first && styles.border]} accessible accessibilityLabel={`${s.period}، ${s.subject}${s.teacher ? `، ${s.teacher}` : ""}`}>
    <View style={styles.period}>
      <AppText variant="micro" weight="bold" color={COLORS.primary} align="center" numberOfLines={2}>{s.period}</AppText>
    </View>
    <View style={styles.flex}>
      <AppText variant="bodyStrong" numberOfLines={2}>{s.subject}</AppText>
      <View style={styles.meta}>
        {s.start ? (
          <View style={styles.metaItem}><Clock size={13} color={COLORS.mutedForeground} /><AppText variant="micro" color={COLORS.mutedForeground}>{`${hm(s.start)} – ${hm(s.end)}`}</AppText></View>
        ) : null}
        {s.teacher ? (
          <View style={styles.metaItem}><UserRound size={13} color={COLORS.mutedForeground} /><AppText variant="micro" color={COLORS.mutedForeground} numberOfLines={1}>{s.teacher}</AppText></View>
        ) : null}
      </View>
    </View>
  </View>
);

const DayList: React.FC<{ rows: Slot[] }> = ({ rows }) =>
  rows.length ? (
    <Panel>{rows.map((s, i) => <Lesson key={`${s.day}-${s.sort}-${s.subject}`} s={s} first={i === 0} />)}</Panel>
  ) : (
    <DataState empty emptyTitle="لا توجد حصص في هذا اليوم" />
  );

export const StudentSchedule: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("day");
  const week = useMemo(() => schoolWeek(new Date()), []);
  const today = riyadhWeekday(new Date());
  const [day, setDay] = useState(today <= 4 ? today : 0);
  const ov = useStudentQuery((_, id) => fetchOverview(id));
  const hw = useStudentQuery((_, id) => fetchHomework(id), [tab === "tests"]);
  const rows = ov.data?.timetable ?? [];
  const tests = byKind(hw.data ?? [], "test").sort((a, b) => a.effective_due.localeCompare(b.effective_due));

  return (
    <ScrollView style={studentStyles.screen} contentContainerStyle={[studentStyles.content, { paddingTop: insets.top + SPACING.md, paddingBottom: SPACING.xxxl }]}>
      <StatusBar style="dark" />
      <ScreenTitle eyebrow={ov.data?.student.section ? `شعبة ${ov.data.student.section}` : "جدولي"} title="الجدول الدراسي" />
      <SegmentTabs label="الجدول" value={tab} onChange={setTab} items={[{ key: "day", label: "اليوم" }, { key: "week", label: "الأسبوع" }, { key: "tests", label: "الاختبارات" }]} />
      {tab === "day" ? (
        <View style={styles.days} accessibilityRole="tablist" accessibilityLabel="أيام الأسبوع">
          {week.map((d, i) => {
            const on = i === day;
            return (
              <Pressable key={d.label} onPress={() => setDay(i)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={DAY_NAMES[i]} style={[styles.day, on && styles.dayOn]}>
                <AppText variant="micro" align="center" color={on ? COLORS.primaryForeground : COLORS.mutedForeground}>{d.label}</AppText>
                <AppText variant="headline" weight="extrabold" align="center" color={on ? COLORS.primaryForeground : COLORS.foreground}>{String(d.day)}</AppText>
                {i === today ? <View style={[styles.todayDot, on && { backgroundColor: COLORS.accent }]} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <FadeIn key={`${tab}-${day}`}>
        {tab === "tests" ? (
          <DataState loading={hw.loading} error={hw.error} missing={hw.missing} empty={!tests.length} emptyTitle="لا توجد اختبارات مجدولة" onRetry={hw.reload}>
            <Panel>
              {tests.map((t, i) => (
                <View key={t.id} style={[styles.lesson, i > 0 && styles.border]}>
                  <View style={styles.flex}>
                    <AppText variant="bodyStrong" numberOfLines={2}>{t.title}</AppText>
                    <AppText variant="micro" color={COLORS.mutedForeground}>{`${t.subject} · ${schoolTime(t.effective_due)}`}</AppText>
                  </View>
                  <Pill label={SUB_STATUS[t.sub_status] ?? t.sub_status} tone={t.sub_status === "none" ? "accent" : "primary"} />
                </View>
              ))}
            </Panel>
          </DataState>
        ) : (
          <DataState loading={ov.loading} error={ov.error} missing={ov.missing} empty={!rows.length} emptyTitle="لا يوجد جدول منشور لشعبتك بعد" emptyHint="يظهر الجدول بعد اعتماده ونشره من إدارة المدرسة." onRetry={ov.reload}>
            {tab === "day" ? (
              <DayList rows={lessonsOn(rows, day)} />
            ) : (
              <View style={styles.weekList}>
                {[0, 1, 2, 3, 4].map((d) => (
                  <View key={d} style={styles.weekDay}>
                    <AppText variant="bodyStrong" weight="extrabold" accessibilityRole="header" color={d === today ? COLORS.primary : COLORS.foreground}>{DAY_NAMES[d]}</AppText>
                    <DayList rows={lessonsOn(rows, d)} />
                  </View>
                ))}
              </View>
            )}
          </DataState>
        )}
      </FadeIn>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  days: { flexDirection: "row", gap: SPACING.sm },
  day: { flex: 1, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingVertical: SPACING.sm, minHeight: 64, alignItems: "center" },
  dayOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  todayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary, marginTop: 2 },
  lesson: { flexDirection: "row", alignItems: "center", gap: SPACING.md, paddingVertical: SPACING.md },
  border: { borderTopWidth: 1, borderTopColor: COLORS.border },
  period: { width: 58, minHeight: 44, borderRadius: 12, backgroundColor: COLORS.primaryTint, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  meta: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.md, marginTop: 2 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  weekList: { gap: SPACING.lg },
  weekDay: { gap: SPACING.sm },
});
