import React from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from "react-native";
import {
  Award, Bell, BookOpen, Briefcase, CalendarDays, ClipboardCheck, ClipboardList, DoorOpen, FileBarChart, GraduationCap,
  HeartHandshake, HeartPulse, LifeBuoy, LucideIcon, Megaphone, MessagesSquare, Network, PartyPopper, ScanLine, School,
  ShieldCheck, Sparkles, UserCog, Users, UsersRound,
} from "lucide-react-native";
import { AppText } from "./ui";
import { FadeIn } from "./FadeIn";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { pressScale } from "../lib/motion";
import { CONFIG } from "../config";
import type { Role, SchoolPerms } from "../api/types";
import { groupSections, isFamilyRole, SECTION_GROUP_LABEL, SECTIONS, sectionLabel, sectionsFor } from "../lib/sections";
import { COLORS, RADIUS, SHADOWS, SPACING } from "../theme/tokens";

const ICONS: Record<string, LucideIcon> = {
  Award, Bell, BookOpen, Briefcase, CalendarDays, ClipboardCheck, ClipboardList, DoorOpen, FileBarChart, GraduationCap,
  HeartHandshake, HeartPulse, LifeBuoy, Megaphone, MessagesSquare, Network, PartyPopper, ScanLine, School,
  ShieldCheck, Sparkles, UserCog, Users, UsersRound,
};

/** أقسام الصفة النشطة مجمّعة؛ كل قسم يفتح صفحته في منصة ركاز حتى يُبنى في التطبيق */
export const RoleSections: React.FC<{ role: Role; perms: SchoolPerms | null; loading?: boolean }> = ({ role, perms, loading }) => {
  const waitingPerms = !isFamilyRole(role) && (loading || perms === null);
  if (waitingPerms) {
    return (
      <View style={styles.loading} accessibilityLabel="جارٍ تحميل الأقسام">
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }
  const groups = groupSections(sectionsFor(role, perms));
  return <SectionGroups groups={groups} role={role} />;
};

const SectionGroups: React.FC<{ groups: ReturnType<typeof groupSections>; role: Role }> = ({ groups, role }) => {
  const reduced = useReducedMotion();
  return (
    <FadeIn style={styles.wrap}>
      {groups.map((g) => (
        <View key={g.group} style={styles.group}>
          <View style={styles.groupHead}>
            <View style={styles.groupMark} />
            <AppText variant="label" color={COLORS.mutedForeground} accessibilityRole="header">
              {SECTION_GROUP_LABEL[g.group]}
            </AppText>
          </View>
          <View style={styles.grid}>
            {g.keys.map((k) => {
              const def = SECTIONS[k];
              const Icon = ICONS[def.icon] ?? ClipboardList;
              const label = sectionLabel(k, role);
              return (
                <Pressable
                  key={k}
                  accessibilityRole="link"
                  accessibilityLabel={label}
                  accessibilityHint="يفتح القسم في منصة ركاز، وقد يُطلب منك الدخول هناك"
                  onPress={() => void Linking.openURL(`${CONFIG.platformUrl}${def.path}`)}
                  style={({ pressed }) => [styles.tile, pressed && styles.pressed, { transform: [{ scale: pressScale(pressed, reduced) }] }]}
                >
                  <View style={styles.icon}>
                    <Icon size={24} color={COLORS.primary} strokeWidth={2} />
                  </View>
                  <AppText variant="micro" weight="semibold" align="center" style={styles.tileText}>
                    {label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
      <AppText variant="caption" color={COLORS.mutedForeground}>
        تفتح الأقسام حاليًا في منصة ركاز على الويب، وتظهر لك حسب صفتك وصلاحياتك في المدرسة.
      </AppText>
    </FadeIn>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: SPACING.xl },
  loading: { paddingVertical: SPACING.xxl, alignItems: "center" },
  group: { gap: SPACING.md },
  groupHead: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, paddingHorizontal: SPACING.xs },
  groupMark: { width: 4, height: 16, borderRadius: 2, backgroundColor: COLORS.accent },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.md },
  tile: {
    flexGrow: 1,
    flexBasis: "30%",
    minWidth: 96,
    minHeight: 108,
    padding: SPACING.md,
    gap: SPACING.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  pressed: { opacity: 0.75, backgroundColor: COLORS.primaryTint },
  icon: { width: 48, height: 48, borderRadius: RADIUS.md, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.primaryTint },
  tileText: { flexShrink: 1 },
});
