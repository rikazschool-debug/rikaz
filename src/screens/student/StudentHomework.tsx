import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppText } from "../../components/ui";
import { FadeIn } from "../../components/FadeIn";
import { BackHeader, DataState, Panel, Pill, SegmentTabs, studentStyles } from "../../components/StudentKit";
import { fetchHomework } from "../../api/student";
import { byKind, groupHomework, HW_GROUP_LABEL, schoolTime, SUB_STATUS, type HwGroup } from "../../lib/studentData";
import { useStudentQuery } from "./useStudentData";
import { COLORS, SPACING } from "../../theme/tokens";

const GROUPS: HwGroup[] = ["due", "late", "returned", "done", "all"];
const tone = (s: string) => (s === "returned" ? "danger" : ["submitted", "resubmitted", "paper"].includes(s) ? "success" : "accent") as "danger" | "success" | "accent";

/** الواجبات والاختبارات كما في مذكرة الواجبات بالمنصة. */
export const StudentHomework: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [kind, setKind] = useState<"homework" | "test">("homework");
  const [group, setGroup] = useState<HwGroup>("due");
  const q = useStudentQuery((_, id) => fetchHomework(id));
  const groups = groupHomework(byKind(q.data ?? [], kind), Date.now());
  const rows = groups[group];
  return (
    <ScrollView style={studentStyles.screen} contentContainerStyle={[studentStyles.content, { paddingTop: insets.top + SPACING.md, paddingBottom: SPACING.xxxl }]}>
      <StatusBar style="dark" />
      <BackHeader eyebrow="مذكرة الواجبات" title="الواجبات والاختبارات" onBack={onBack} />
      <SegmentTabs label="النوع" value={kind} onChange={setKind} items={[{ key: "homework", label: "الواجبات" }, { key: "test", label: "الاختبارات" }]} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {GROUPS.map((g) => (
          <AppText key={g} onPress={() => setGroup(g)} accessibilityRole="tab" accessibilityState={{ selected: g === group }} variant="label" weight="bold"
            color={g === group ? COLORS.primaryForeground : COLORS.mutedForeground} style={[styles.chip, g === group && styles.chipOn]}>
            {`${HW_GROUP_LABEL[g]} (${groups[g].length})`}
          </AppText>
        ))}
      </ScrollView>
      <FadeIn key={`${kind}-${group}`}>
        <DataState loading={q.loading} error={q.error} missing={q.missing} empty={!rows.length} emptyTitle={kind === "test" ? "لا توجد اختبارات هنا" : "لا توجد واجبات هنا"} onRetry={q.reload}>
          <View style={styles.list}>
            {rows.map((r) => (
              <Panel key={r.id} style={styles.card}>
                <View style={styles.head}>
                  <AppText variant="bodyStrong" style={styles.flex} numberOfLines={2}>{r.title}</AppText>
                  <Pill label={SUB_STATUS[r.sub_status] ?? r.sub_status} tone={tone(r.sub_status)} />
                </View>
                <AppText variant="micro" color={COLORS.mutedForeground}>{`${r.kind === "test" ? "اختبار" : "واجب"} · ${r.subject}`}</AppText>
                <AppText variant="caption">{`الموعد: ${schoolTime(r.effective_due)}${r.effective_due !== r.due_at ? " (ممدد)" : ""}`}</AppText>
                {r.last_late ? <AppText variant="micro" color={COLORS.destructive}>سُلّم متأخرًا</AppText> : null}
                {r.removed ? <AppText variant="micro" color={COLORS.mutedForeground}>انتقلت من الشعبة؛ يبقى للاطلاع فقط</AppText> : null}
              </Panel>
            ))}
          </View>
        </DataState>
      </FadeIn>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chips: { gap: SPACING.sm, paddingVertical: 2 },
  chip: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card, borderRadius: 999, paddingHorizontal: SPACING.md, paddingVertical: 6, overflow: "hidden" },
  chipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  list: { gap: SPACING.md },
  card: { paddingVertical: SPACING.md, gap: 4 },
  head: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.sm },
});
