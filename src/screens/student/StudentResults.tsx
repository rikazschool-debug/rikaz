import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppText } from "../../components/ui";
import { FadeIn } from "../../components/FadeIn";
import { BackHeader, DataState, Panel, studentStyles } from "../../components/StudentKit";
import { fetchResults } from "../../api/student";
import { itemValue, schoolDate } from "../../lib/studentData";
import { useStudentQuery } from "./useStudentData";
import { COLORS, SPACING } from "../../theme/tokens";

/** النتائج المنشورة من إدارة المدرسة فقط؛ بلا ترتيب أو تقدير نجاح ورسوب، كما في المنصة. */
export const StudentResults: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const q = useStudentQuery((schoolId, id) => fetchResults(schoolId, id));
  const all = q.data ?? [];
  const periods = [...new Set(all.map((r) => r.period_name))];
  const [period, setPeriod] = useState("");
  const rows = all.filter((r) => !period || r.period_name === period);
  return (
    <ScrollView style={studentStyles.screen} contentContainerStyle={[studentStyles.content, { paddingTop: insets.top + SPACING.md, paddingBottom: SPACING.xxxl }]}>
      <StatusBar style="dark" />
      <BackHeader eyebrow="المنشورة فقط" title="الدرجات والنتائج" onBack={onBack} />
      {periods.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {["", ...periods].map((p) => (
            <AppText key={p || "all"} onPress={() => setPeriod(p)} accessibilityRole="tab" accessibilityState={{ selected: p === period }} variant="label" weight="bold"
              color={p === period ? COLORS.primaryForeground : COLORS.mutedForeground} style={[styles.chip, p === period && styles.chipOn]}>
              {p || "كل الفترات"}
            </AppText>
          ))}
        </ScrollView>
      ) : null}
      <FadeIn key={period}>
        <DataState loading={q.loading} error={q.error} missing={q.missing} empty={!rows.length} emptyTitle="لا توجد نتائج منشورة بعد" emptyHint="تظهر النتيجة بعد اعتمادها ونشرها من إدارة المدرسة." onRetry={q.reload}>
          <View style={styles.list}>
            {rows.map((r) => (
              <Panel key={r.id} style={styles.card}>
                <View style={styles.head}>
                  <View style={styles.flex}>
                    <AppText variant="bodyStrong" numberOfLines={2}>{r.subject_name}</AppText>
                    <AppText variant="micro" color={COLORS.mutedForeground}>{`${r.period_name} · نُشرت ${schoolDate(r.published_at)}${r.version > 1 ? ` · محدّثة (إصدار ${r.version})` : ""}`}</AppText>
                  </View>
                  {r.total != null ? (
                    <AppText variant="headline" weight="extrabold" color={COLORS.primary}>
                      {String(r.total)}
                      <AppText variant="caption" color={COLORS.mutedForeground}>{` / ${r.max_total}`}</AppText>
                    </AppText>
                  ) : (
                    <AppText variant="caption" color={COLORS.mutedForeground}>غير مكتمل</AppText>
                  )}
                </View>
                {(r.items ?? []).map((i, n) => (
                  <View key={n} style={styles.item}>
                    <AppText variant="caption" style={styles.flex}>{i.name}</AppText>
                    <AppText variant="caption" weight="bold">{itemValue(i)}</AppText>
                  </View>
                ))}
                {r.note ? <AppText variant="caption" style={styles.note}>{`ملاحظة المعلم: ${r.note}`}</AppText> : null}
                {r.change_note ? <AppText variant="micro" color={COLORS.mutedForeground}>{r.change_note}</AppText> : null}
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
  card: { paddingVertical: SPACING.md, gap: SPACING.xs },
  head: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  item: { flexDirection: "row", gap: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.xs },
  note: { backgroundColor: COLORS.muted, borderRadius: 10, padding: SPACING.sm, marginTop: SPACING.xs },
});
