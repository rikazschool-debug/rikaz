import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { AppText } from "../../components/ui";
import { BackHeader, DataState, Panel, Pill, studentStyles } from "../../components/StudentKit";
import { fetchAttendance } from "../../api/student";
import { ATT_LABEL, ATT_STATUSES, countBy, isWeekend, monthGrid, monthRange, MONTHS, shiftMonth } from "../../lib/studentData";
import { useStudentQuery } from "./useStudentData";
import { COLORS, SPACING } from "../../theme/tokens";

const WEEK = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
const TONE: Record<string, { bg: string; fg: string; pill: "success" | "accent" | "primary" | "danger" | "muted" }> = {
  present: { bg: COLORS.successTint, fg: COLORS.success, pill: "success" },
  late: { bg: COLORS.warningTint, fg: "#8a5a12", pill: "accent" },
  excused: { bg: COLORS.primaryTint, fg: COLORS.primary, pill: "primary" },
  absent: { bg: COLORS.destructiveTint, fg: COLORS.destructive, pill: "danger" },
  in_school_absent: { bg: COLORS.destructiveTint, fg: COLORS.destructive, pill: "danger" },
  pending_review: { bg: COLORS.muted, fg: COLORS.mutedForeground, pill: "muted" },
};

/** تقويم الحضور الشهري؛ اليوم غير المرصود لا يُحسب غيابًا. */
export const StudentAttendance: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [pick, setPick] = useState<string | null>(null);
  const { from, to } = monthRange(ym.y, ym.m);
  const q = useStudentQuery((_, id) => fetchAttendance(id, from, to), [from]);
  const rows = q.data?.rows ?? [];
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const c = countBy(rows);
  const sel = pick ? byDate.get(pick) : null;
  const move = (by: number) => { setPick(null); setYm(shiftMonth(ym.y, ym.m, by)); };
  return (
    <ScrollView style={studentStyles.screen} contentContainerStyle={[studentStyles.content, { paddingTop: insets.top + SPACING.md, paddingBottom: SPACING.xxxl }]}>
      <StatusBar style="dark" />
      <BackHeader eyebrow="المواظبة" title="الحضور والغياب" onBack={onBack} />
      <Panel style={styles.panel}>
        <View style={styles.monthRow}>
          <Pressable onPress={() => move(-1)} accessibilityRole="button" accessibilityLabel="الشهر السابق" style={styles.nav}><ChevronRight size={18} color={COLORS.foreground} /></Pressable>
          <AppText variant="bodyStrong" weight="extrabold" accessibilityRole="header">{`${MONTHS[ym.m]} ${ym.y}`}</AppText>
          <Pressable onPress={() => move(1)} accessibilityRole="button" accessibilityLabel="الشهر التالي" style={styles.nav}><ChevronLeft size={18} color={COLORS.foreground} /></Pressable>
        </View>
        <DataState loading={q.loading} error={q.error} missing={q.missing} onRetry={q.reload}>
          <View style={styles.grid}>
            {WEEK.map((w) => <AppText key={w} variant="micro" weight="bold" color={COLORS.mutedForeground} align="center" style={styles.cell}>{w}</AppText>)}
            {monthGrid(ym.y, ym.m).map((d, i) => {
              if (!d) return <View key={`b${i}`} style={styles.cell} />;
              const r = byDate.get(d);
              const t = r ? TONE[r.status] : null;
              const off = !r && isWeekend(d);
              const label = r ? ATT_LABEL[r.status] ?? r.status : off ? "عطلة" : "لم يُرصد";
              return (
                <View key={d} style={styles.cell}>
                  <Pressable onPress={() => setPick(d)} accessibilityRole="button" accessibilityLabel={`${Number(d.slice(8))}، ${label}`}
                    style={[styles.dayBox, { backgroundColor: t?.bg ?? (off ? COLORS.muted : COLORS.card) }, d === q.data?.today && styles.today, pick === d && styles.picked]}>
                    <AppText variant="label" weight="bold" color={t?.fg ?? (off ? COLORS.mutedForeground : COLORS.foreground)} align="center">{String(Number(d.slice(8)))}</AppText>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </DataState>
      </Panel>
      {pick ? (
        <Panel style={styles.detail}>
          <AppText variant="micro" color={COLORS.mutedForeground}>{pick}</AppText>
          {sel ? <Pill label={ATT_LABEL[sel.status] ?? sel.status} tone={TONE[sel.status]?.pill ?? "muted"} /> : <AppText variant="caption" color={COLORS.mutedForeground}>{isWeekend(pick) ? "عطلة نهاية الأسبوع" : "لم يُرصد حضور لهذا اليوم"}</AppText>}
          {sel?.note ? <AppText variant="caption">{sel.note}</AppText> : null}
        </Panel>
      ) : null}
      {rows.length ? (
        <View style={styles.summary}>
          {ATT_STATUSES.filter((s) => c[s]).map((s) => (
            <View key={s} style={[styles.stat, { backgroundColor: TONE[s].bg }]}>
              <AppText variant="headline" weight="extrabold" color={TONE[s].fg} align="center">{String(c[s])}</AppText>
              <AppText variant="micro" color={TONE[s].fg} align="center" numberOfLines={2}>{ATT_LABEL[s]}</AppText>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  panel: { paddingVertical: SPACING.md, gap: SPACING.md },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  nav: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, padding: 2 },
  dayBox: { aspectRatio: 1, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  today: { borderColor: COLORS.primary, borderWidth: 2 },
  picked: { borderColor: COLORS.foreground, borderWidth: 2 },
  detail: { paddingVertical: SPACING.md, gap: SPACING.xs },
  summary: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  stat: { flexBasis: "30%", flexGrow: 1, borderRadius: 14, padding: SPACING.sm, gap: 2 },
});
