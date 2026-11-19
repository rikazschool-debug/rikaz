import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "../../components/ui";
import { FadeIn } from "../../components/FadeIn";
import { DataState } from "../../components/StudentKit";
import { fetchHomework } from "../../api/student";
import { byKind, groupHomework, HW_GROUP_LABEL, schoolTime, SUB_STATUS, type HwGroup } from "../../lib/studentData";
import { useStudentQuery } from "../student/useStudentData";
import { HomeworkDetail } from "../shared/HomeworkDetail";
import { Pressable } from "react-native";
import { SPACING } from "../../theme/tokens";
import { G as S } from "../../theme/guardian";
import { SBadge, SCard, SChips, SHeader, SPillTabs, SScreen, SCircleButton } from "../../components/student/SKit";
import { ChevronRight } from "lucide-react-native";

const GROUPS: HwGroup[] = ["due", "late", "returned", "done", "all"];

/** الواجبات والاختبارات كما في مذكرة الواجبات بالمنصة. */
export const GuardianHomework: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [kind, setKind] = useState<"homework" | "test">("homework");
  const [group, setGroup] = useState<HwGroup>("due");
  const [open, setOpen] = useState<string | null>(null);
  const q = useStudentQuery((_, id) => fetchHomework(id), [open]);
  const groups = groupHomework(byKind(q.data ?? [], kind), Date.now());
  const rows = groups[group];
  if (open) return <HomeworkDetail id={open} role="guardian" onBack={() => setOpen(null)} />;
  return (
    <SScreen topInset>
      <SHeader eyebrow="مذكرة الواجبات" title="الواجبات والاختبارات" action={<SCircleButton icon={ChevronRight} label="رجوع" onPress={onBack}/>}/>
      <SPillTabs label="النوع" value={kind} onChange={setKind} items={[{key:"homework",label:"الواجبات"},{key:"test",label:"الاختبارات"}]}/>
      <SChips label="حالة الواجب" value={group} onChange={setGroup} items={GROUPS.map(g=>({key:g,label:HW_GROUP_LABEL[g],count:groups[g].length}))}/>
      <FadeIn key={`${kind}-${group}`}>
        <DataState loading={q.loading} error={q.error} missing={q.missing} empty={!rows.length} emptyTitle={kind === "test" ? "لا توجد اختبارات هنا" : "لا توجد واجبات هنا"} onRetry={q.reload}>
          <View style={styles.list}>
            {rows.map((r) => (
              <Pressable key={r.id} accessibilityRole="button" accessibilityLabel={r.title} onPress={() => setOpen(r.id)} style={({ pressed }) => pressed && { opacity: 0.85 }}>
              <SCard style={styles.card}>
                <View style={styles.head}>
                  <AppText variant="bodyStrong" style={styles.flex} numberOfLines={2}>{r.title}</AppText>
                  <SBadge label={SUB_STATUS[r.sub_status] ?? r.sub_status} tone={r.sub_status === "returned" ? "danger" : ["submitted", "resubmitted", "paper"].includes(r.sub_status) ? "mint" : "amber"} />
                </View>
                <AppText variant="micro" color={S.text2}>{`${r.kind === "test" ? "اختبار" : "واجب"} · ${r.subject}`}</AppText>
                <AppText variant="caption">{`الموعد: ${schoolTime(r.effective_due)}${r.effective_due !== r.due_at ? " (ممدد)" : ""}`}</AppText>
                {r.last_late ? <AppText variant="micro" color={S.danger}>سُلّم متأخرًا</AppText> : null}
                {r.removed ? <AppText variant="micro" color={S.text2}>انتقلت من الشعبة؛ يبقى للاطلاع فقط</AppText> : null}
              </SCard>
              </Pressable>
            ))}
          </View>
        </DataState>
      </FadeIn>
    </SScreen>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chips: { gap: SPACING.sm, paddingVertical: 2 },
  chip: { borderWidth: 1, borderColor: S.border, backgroundColor: S.surface, borderRadius: 999, paddingHorizontal: SPACING.md, paddingVertical: 6, overflow: "hidden" },
  chipOn: { backgroundColor: S.primary, borderColor: S.primary },
  list: { gap: SPACING.md },
  card: { paddingVertical: SPACING.md, gap: 4 },
  head: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.sm },
});
