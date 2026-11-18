import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { CalendarDays, ClipboardCheck, Coffee } from "lucide-react-native";
import { AppText, Button } from "../../components/ui";
import { FadeIn } from "../../components/FadeIn";
import { IconTileBox, openSection, Panel, ScreenTitle, SegmentTabs, studentStyles } from "../../components/StudentKit";
import { schoolWeek } from "../../lib/mask";
import { COLORS, SPACING } from "../../theme/tokens";

type Tab = "day" | "week" | "tests";

export const StudentSchedule: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("day");
  const week = useMemo(() => schoolWeek(new Date()), []);
  const [day, setDay] = useState(() => Math.max(0, week.findIndex((d) => d.isToday)));
  const isTests = tab === "tests";
  return (
    <ScrollView style={studentStyles.screen} contentContainerStyle={[studentStyles.content, { paddingTop: insets.top + SPACING.md, paddingBottom: SPACING.xxxl }]}>
      <StatusBar style="dark" />
      <ScreenTitle eyebrow="جدولي" title="الجدول الدراسي" />
      <SegmentTabs label="الجدول" value={tab} onChange={setTab} items={[{ key: "day", label: "اليوم" }, { key: "week", label: "الأسبوع" }, { key: "tests", label: "الاختبارات" }]} />
      {!isTests ? (
        <View style={styles.days} accessibilityRole="tablist" accessibilityLabel="أيام الأسبوع">
          {week.map((d, i) => {
            const on = i === day;
            return (
              <View key={d.label} style={styles.dayWrap}>
                <AppText
                  onPress={() => setDay(i)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  style={[styles.day, on && styles.dayOn]}
                  align="center"
                  variant="micro"
                  color={on ? COLORS.primaryForeground : COLORS.mutedForeground}
                >
                  {`${d.label}\n`}
                  <AppText variant="headline" weight="extrabold" color={on ? COLORS.primaryForeground : COLORS.foreground}>{String(d.day)}</AppText>
                </AppText>
              </View>
            );
          })}
        </View>
      ) : null}
      <FadeIn key={`${tab}-${day}`}>
        <Panel style={styles.panel}>
          <View style={styles.hero}>
            <IconTileBox icon={isTests ? ClipboardCheck : CalendarDays} size={56} />
            <AppText variant="headline" weight="extrabold" align="center">
              {isTests ? "مواعيد الاختبارات" : tab === "week" ? "جدول الأسبوع" : `حصص يوم ${week[day]?.label ?? ""}`}
            </AppText>
            <AppText variant="caption" color={COLORS.mutedForeground} align="center">
              {isTests ? "اطّلع على اختباراتك القادمة ومواعيدها." : "حصصك وأوقاتها ومعلموها كما اعتمدتها المدرسة."}
            </AppText>
          </View>
          <Button title={isTests ? "فتح الاختبارات" : "فتح جدولي"} onPress={() => openSection(isTests ? "tests" : "schedule")} />
        </Panel>
      </FadeIn>
      <View style={styles.note}>
        <Coffee size={15} color="#8a5a12" />
        <AppText variant="micro" color="#8a5a12" style={styles.flex}>يفتح الجدول حاليًا في منصة ركاز على الويب.</AppText>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  days: { flexDirection: "row", gap: SPACING.sm },
  dayWrap: { flex: 1 },
  day: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingVertical: SPACING.sm, overflow: "hidden" },
  dayOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  panel: { paddingVertical: SPACING.xl, gap: SPACING.lg },
  hero: { alignItems: "center", gap: SPACING.xs },
  note: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, backgroundColor: COLORS.warningTint, borderRadius: 12, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
});
