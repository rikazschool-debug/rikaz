import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Award, Bell, CalendarCheck, CalendarDays, ClipboardCheck, ClipboardList, DoorOpen, MessagesSquare, PartyPopper, School, type LucideIcon } from "lucide-react-native";
import { AppText } from "../../components/ui";
import { IconTileBox, openSection, ScreenTitle, studentStyles, WEB_HINT, WebCard } from "../../components/StudentKit";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { pressScale } from "../../lib/motion";
import { groupSections, SECTION_GROUP_LABEL, sectionLabel, sectionsFor, type SectionKey } from "../../lib/sections";
import { CONFIG } from "../../config";
import type { StudentSub, StudentTab } from "./StudentHome";
import { COLORS, RADIUS, SPACING } from "../../theme/tokens";

const ICON: Partial<Record<SectionKey, LucideIcon>> = {
  classrooms: School, homework: ClipboardList, schedule: CalendarDays, pickup: DoorOpen,
  communication: MessagesSquare, notifications: Bell, events: PartyPopper, tests: ClipboardCheck,
};
const HINT: Partial<Record<SectionKey, string>> = {
  classrooms: "مقرراتك ودروسك", homework: "واجباتك ومواعيدها", schedule: "حصص اليوم والأسبوع", pickup: "طلبات الخروج المبكر",
  communication: "معلموك ومجموعاتك", notifications: "تنبيهاتك", events: "فعاليات المدرسة", tests: "اختباراتك ومواعيدها",
};

/** كل أقسام الطالب كما في المنصة، مجمّعة. */
/** أقسام لها شاشة داخل التطبيق؛ البقية تفتح في المنصة. */
const IN_APP: Partial<Record<SectionKey, { sub?: StudentSub; tab?: StudentTab }>> = { homework: { sub: "homework" }, tests: { sub: "homework" }, schedule: { tab: "schedule" }, communication: { tab: "comm" } };
const EXTRA: { sub: StudentSub; label: string; hint: string; icon: LucideIcon }[] = [
  { sub: "results", label: "الدرجات والنتائج", hint: "نتائجك المنشورة", icon: Award },
  { sub: "attendance", label: "الحضور والغياب", hint: "تقويم المواظبة", icon: CalendarCheck },
];

export const StudentMore: React.FC<{ onOpen: (s: StudentSub) => void; onTab: (t: StudentTab) => void }> = ({ onOpen, onTab }) => {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const groups = groupSections(sectionsFor("student", null));
  return (
    <ScrollView style={studentStyles.screen} contentContainerStyle={[studentStyles.content, { paddingTop: insets.top + SPACING.md, paddingBottom: SPACING.xxxl }]}>
      <StatusBar style="dark" />
      <ScreenTitle eyebrow="كل الأقسام" title="المزيد" />
      <View style={styles.group}>
        <AppText variant="bodyStrong" weight="extrabold" accessibilityRole="header">ملفي الدراسي</AppText>
        <View style={styles.grid}>
          {EXTRA.map((x) => (
            <Pressable key={x.sub} onPress={() => onOpen(x.sub)} accessibilityRole="button" accessibilityLabel={x.label}
              style={({ pressed }) => [styles.card, pressed && styles.pressed, { transform: [{ scale: pressScale(pressed, reduced) }] }]}>
              <IconTileBox icon={x.icon} />
              <AppText variant="bodyStrong" numberOfLines={2}>{x.label}</AppText>
              <AppText variant="micro" color={COLORS.mutedForeground} numberOfLines={1}>{x.hint}</AppText>
            </Pressable>
          ))}
        </View>
      </View>
      {groups.map((g) => (
        <View key={g.group} style={styles.group}>
          <AppText variant="bodyStrong" weight="extrabold" accessibilityRole="header">{SECTION_GROUP_LABEL[g.group]}</AppText>
          <View style={styles.grid}>
            {g.keys.map((k) => {
              const label = sectionLabel(k, "student");
              const inApp = IN_APP[k];
              const press = () => (inApp?.sub ? onOpen(inApp.sub) : inApp?.tab ? onTab(inApp.tab) : openSection(k));
              return (
                <Pressable key={k} onPress={press} accessibilityRole={inApp ? "button" : "link"} accessibilityLabel={label} accessibilityHint={inApp ? undefined : WEB_HINT}
                  style={({ pressed }) => [styles.card, pressed && styles.pressed, { transform: [{ scale: pressScale(pressed, reduced) }] }]}>
                  <IconTileBox icon={ICON[k] ?? ClipboardList} />
                  <AppText variant="bodyStrong" numberOfLines={2}>{label}</AppText>
                  {HINT[k] ? <AppText variant="micro" color={COLORS.mutedForeground} numberOfLines={1}>{HINT[k]}</AppText> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
      <WebCard title="منصة ركاز على الويب" subtitle="لإدارة بياناتك وبقية الأقسام" onPress={() => void Linking.openURL(CONFIG.platformUrl)} />
      <AppText variant="micro" color={COLORS.mutedForeground} align="center">الفصول الرقمية والاستئذان والفعاليات والإشعارات تفتح حاليًا في منصة ركاز.</AppText>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  group: { gap: SPACING.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.md },
  card: { flexBasis: "46%", flexGrow: 1, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg + 2, padding: SPACING.md, gap: 4 },
  pressed: { backgroundColor: COLORS.primaryTint, borderColor: COLORS.primary },
});
