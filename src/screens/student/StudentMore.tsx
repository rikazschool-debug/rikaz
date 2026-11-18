import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Bell, CalendarDays, ClipboardCheck, ClipboardList, DoorOpen, MessagesSquare, PartyPopper, School, type LucideIcon } from "lucide-react-native";
import { AppText } from "../../components/ui";
import { IconTileBox, openSection, ScreenTitle, studentStyles, WEB_HINT, WebCard } from "../../components/StudentKit";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { pressScale } from "../../lib/motion";
import { groupSections, SECTION_GROUP_LABEL, sectionLabel, sectionsFor, type SectionKey } from "../../lib/sections";
import { CONFIG } from "../../config";
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
export const StudentMore: React.FC = () => {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const groups = groupSections(sectionsFor("student", null));
  return (
    <ScrollView style={studentStyles.screen} contentContainerStyle={[studentStyles.content, { paddingTop: insets.top + SPACING.md, paddingBottom: SPACING.xxxl }]}>
      <StatusBar style="dark" />
      <ScreenTitle eyebrow="كل الأقسام" title="المزيد" />
      {groups.map((g) => (
        <View key={g.group} style={styles.group}>
          <AppText variant="bodyStrong" weight="extrabold" accessibilityRole="header">{SECTION_GROUP_LABEL[g.group]}</AppText>
          <View style={styles.grid}>
            {g.keys.map((k) => {
              const label = sectionLabel(k, "student");
              return (
                <Pressable key={k} onPress={() => openSection(k)} accessibilityRole="link" accessibilityLabel={label} accessibilityHint={WEB_HINT}
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
      <AppText variant="micro" color={COLORS.mutedForeground} align="center">تفتح الأقسام حاليًا في منصة ركاز على الويب.</AppText>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  group: { gap: SPACING.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.md },
  card: { flexBasis: "46%", flexGrow: 1, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg + 2, padding: SPACING.md, gap: 4 },
  pressed: { backgroundColor: COLORS.primaryTint, borderColor: COLORS.primary },
});
