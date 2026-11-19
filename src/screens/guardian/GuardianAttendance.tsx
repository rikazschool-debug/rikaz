import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { AppText } from "../../components/ui";
import { DataState } from "../../components/StudentKit";
import { fetchAttendance } from "../../api/student";
import { ATT_LABEL, ATT_STATUSES, countBy, isWeekend, monthGrid, monthRange, MONTHS, shiftMonth } from "../../lib/studentData";
import { useStudentQuery } from "../student/useStudentData";
import { SPACING } from "../../theme/tokens";
import { G } from "../../theme/guardian";
import { SCard, SHeader, SScreen, SCircleButton, SBadge } from "../../components/student/SKit";

const WEEK = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
const TONE: Record<string, { bg: string; fg: string; pill: "success" | "accent" | "primary" | "danger" | "muted" }> = {
  present: { bg: G.mint, fg: G.primary, pill: "success" },
  late: { bg: G.amberWash, fg: G.amberText, pill: "accent" },
  excused: { bg: G.mint, fg: G.primary, pill: "primary" },
  absent: { bg: G.dangerWash, fg: G.danger, pill: "danger" },
  in_school_absent: { bg: G.dangerWash, fg: G.danger, pill: "danger" },
  pending_review: { bg: G.well, fg: G.muted, pill: "muted" },
};

/** تقويم الحضور الشهري؛ اليوم غير المرصود لا يُحسب غيابًا. */
export const GuardianAttendance: React.FC<{ onBack: () => void }> = ({ onBack }) => {
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
    <SScreen topInset>
      <StatusBar style="dark" />
      <SHeader eyebrow="سجل الانضباط الأكاديمي" title="الحضور والغياب" action={<SCircleButton icon={ChevronRight} label="رجوع" onPress={onBack}/>}/>
      {rows.length ? <View style={styles.hero}><AppText variant="caption" color={G.onPrimaryMuted}>سجل الحضور لهذا الشهر</AppText><AppText variant="title" weight="bold" color={G.onPrimary}>{`${MONTHS[ym.m]} ${ym.y}`}</AppText><View style={styles.summary}>{ATT_STATUSES.filter(status => c[status]).map(status => <View key={status} style={styles.heroStat}><AppText variant="headline" weight="bold" color={G.onPrimary}>{String(c[status])}</AppText><AppText variant="micro" color={G.onPrimaryMuted}>{ATT_LABEL[status]}</AppText></View>)}</View></View> : null}
      <SCard style={styles.panel}>
        <View style={styles.monthRow}>
          <Pressable onPress={() => move(-1)} accessibilityRole="button" accessibilityLabel="الشهر السابق" style={styles.nav}><ChevronRight size={18} color={G.ink} /></Pressable>
          <AppText variant="bodyStrong" weight="extrabold" accessibilityRole="header">{`${MONTHS[ym.m]} ${ym.y}`}</AppText>
          <Pressable onPress={() => move(1)} accessibilityRole="button" accessibilityLabel="الشهر التالي" style={styles.nav}><ChevronLeft size={18} color={G.ink} /></Pressable>
        </View>
        <DataState loading={q.loading} error={q.error} missing={q.missing} onRetry={q.reload}>
          <View style={styles.grid}>
            {WEEK.map((w) => <AppText key={w} variant="micro" weight="bold" color={G.muted} align="center" style={styles.cell}>{w}</AppText>)}
            {monthGrid(ym.y, ym.m).map((d, i) => {
              if (!d) return <View key={`b${i}`} style={styles.cell} />;
              const r = byDate.get(d);
              const t = r ? TONE[r.status] : null;
              const off = !r && isWeekend(d);
              const label = r ? ATT_LABEL[r.status] ?? r.status : off ? "عطلة" : "لم يُرصد";
              return (
                <View key={d} style={styles.cell}>
                  <Pressable onPress={() => setPick(d)} accessibilityRole="button" accessibilityLabel={`${Number(d.slice(8))}، ${label}`}
                    style={[styles.dayBox, { backgroundColor: t?.bg ?? (off ? G.well : G.surface) }, d === q.data?.today && styles.today, pick === d && styles.picked]}>
                    <AppText variant="label" weight="bold" color={t?.fg ?? (off ? G.muted : G.ink)} align="center">{String(Number(d.slice(8)))}</AppText>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </DataState>
      </SCard>
      {pick ? (
        <SCard style={styles.detail}>
          <AppText variant="micro" color={G.muted}>{pick}</AppText>
          {sel ? <SBadge label={ATT_LABEL[sel.status] ?? sel.status} tone={sel.status === "present" ? "mint" : sel.status === "late" ? "amber" : sel.status.includes("absent") ? "danger" : "muted"} /> : <AppText variant="caption" color={G.muted}>{isWeekend(pick) ? "عطلة نهاية الأسبوع" : "لم يُرصد حضور لهذا اليوم"}</AppText>}
          {sel?.note ? <AppText variant="caption">{sel.note}</AppText> : null}
        </SCard>
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
    </SScreen>
  );
};

const styles = StyleSheet.create({
  hero: { backgroundColor: G.primary, borderRadius: 24, padding: SPACING.xl, gap: SPACING.md },
  heroStat: { backgroundColor: G.onPrimarySubtle, borderRadius: 16, padding: SPACING.md, minWidth: 70, flexGrow: 1 },
  panel: { paddingVertical: SPACING.md, gap: SPACING.md },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  nav: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: G.border, alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, padding: 2 },
  dayBox: { aspectRatio: 1, borderRadius: 999, borderWidth: 1, borderColor: G.border, alignItems: "center", justifyContent: "center" },
  today: { borderColor: G.primary, borderWidth: 2 },
  picked: { borderColor: G.ink, borderWidth: 2 },
  detail: { paddingVertical: SPACING.md, gap: SPACING.xs },
  summary: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  stat: { flexBasis: "30%", flexGrow: 1, borderRadius: 14, padding: SPACING.sm, gap: 2 },
});
