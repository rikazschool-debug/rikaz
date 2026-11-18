import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Bell, CalendarDays, ClipboardList, DoorOpen, MessagesSquare, PartyPopper, School, type LucideIcon } from "lucide-react-native";
import { AppText, Button } from "../../components/ui";
import { FadeIn } from "../../components/FadeIn";
import { IconButton, IconTileBox, openSection, Panel, QuickTile, SectionTitle, SegmentTabs, studentStyles } from "../../components/StudentKit";
import { useAuth } from "../../hooks/useAuth";
import type { SectionKey } from "../../lib/sections";
import { useStudentProfile } from "./useStudentProfile";
import { COLORS, SPACING } from "../../theme/tokens";

type Tab = "today" | "homework" | "events";
export type StudentTab = "account" | "comm" | "home" | "schedule" | "more";

const QUICK: { key: SectionKey; label: string; hint: string; icon: LucideIcon; tab?: StudentTab }[] = [
  { key: "homework", label: "الواجبات", hint: "مذكرة الواجبات", icon: ClipboardList },
  { key: "schedule", label: "جدولي", hint: "حصص الأسبوع", icon: CalendarDays, tab: "schedule" },
  { key: "classrooms", label: "الفصول الرقمية", hint: "مقرراتك", icon: School },
  { key: "pickup", label: "الاستئذان", hint: "الخروج المبكر", icon: DoorOpen },
  { key: "communication", label: "المحادثات", hint: "معلموك", icon: MessagesSquare, tab: "comm" },
  { key: "events", label: "الفعاليات", hint: "أنشطة المدرسة", icon: PartyPopper },
];

const TAB_CONTENT: Record<Tab, { icon: LucideIcon; title: string; body: string; action: string; key: SectionKey }> = {
  today: { icon: CalendarDays, title: "حصص اليوم", body: "تابع حصصك ومواعيدها ومعلميك لهذا اليوم.", action: "فتح جدولي", key: "schedule" },
  homework: { icon: ClipboardList, title: "مذكرة الواجبات", body: "اطّلع على واجباتك ومواعيد تسليمها أولًا بأول.", action: "فتح الواجبات", key: "homework" },
  events: { icon: PartyPopper, title: "الأنشطة والفعاليات", body: "تعرّف على فعاليات مدرستك وأنشطتها القادمة.", action: "فتح الفعاليات", key: "events" },
};

function greeting(): string {
  return new Date().getHours() < 12 ? "صباح الخير" : "مساء الخير";
}

function todayLabel(): string {
  try {
    return new Intl.DateTimeFormat("ar-SA", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  } catch {
    return "";
  }
}

export const StudentHome: React.FC<{ onTab: (t: StudentTab) => void }> = ({ onTab }) => {
  const insets = useSafeAreaInsets();
  const { fullName, active } = useAuth();
  const { profile } = useStudentProfile();
  const [tab, setTab] = useState<Tab>("today");
  const name = profile?.full_name || fullName;
  const shortName = name?.trim().split(/\s+/).filter(Boolean);
  const display = shortName && shortName.length > 1 ? `${shortName[0]} ${shortName[shortName.length - 1]}` : name || "طالب ركاز";
  const content = TAB_CONTENT[tab];

  return (
    <ScrollView style={studentStyles.screen} contentContainerStyle={[studentStyles.content, { paddingTop: insets.top + SPACING.md, paddingBottom: SPACING.xxxl }]}>
      <StatusBar style="dark" />
      <View style={styles.top}>
        <View style={styles.avatar}>
          <AppText variant="headline" weight="extrabold" color={COLORS.primaryForeground}>{name?.trim().charAt(0) || "ر"}</AppText>
        </View>
        <View style={styles.flex}>
          <AppText variant="caption" color={COLORS.mutedForeground}>{greeting()}</AppText>
          <AppText variant="headline" weight="extrabold" numberOfLines={1}>{display}</AppText>
        </View>
        <IconButton icon={Bell} label="الإشعارات" onPress={() => openSection("notifications")} />
      </View>

      <FadeIn>
        <LinearGradient colors={["#00756F", COLORS.primaryPressed]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={styles.hero}>
          <View style={styles.ring} />
          <View style={styles.ring2} />
          <View style={styles.chip}>
            <CalendarDays size={14} color={COLORS.primaryForeground} />
            <AppText variant="micro" weight="bold" color={COLORS.primaryForeground}>{todayLabel() || "يومك الدراسي"}</AppText>
          </View>
          <AppText variant="title" weight="extrabold" color={COLORS.primaryForeground} numberOfLines={2}>{active?.schoolName || "مدرستك"}</AppText>
          <AppText variant="caption" color={COLORS.onPrimaryMuted} numberOfLines={2}>{profile?.section || "حسابك الدراسي في ركاز"}</AppText>
          <View style={styles.accent} />
          <Button title="فتح جدولي" variant="secondary" icon={CalendarDays} onPress={() => onTab("schedule")} style={styles.heroBtn} />
        </LinearGradient>
      </FadeIn>

      <SectionTitle title="مهام سريعة" />
      <View style={styles.grid}>
        {QUICK.map((q) => (
          <QuickTile key={q.key} icon={q.icon} label={q.label} hint={q.hint} onPress={() => (q.tab ? onTab(q.tab) : openSection(q.key))} />
        ))}
      </View>

      <SegmentTabs label="يومك" value={tab} onChange={setTab} items={[{ key: "today", label: "اليوم" }, { key: "homework", label: "الواجبات" }, { key: "events", label: "الفعاليات" }]} />
      <FadeIn key={tab}>
        <Panel style={styles.tabPanel}>
          <View style={styles.tabRow}>
            <IconTileBox icon={content.icon} tone={tab === "homework" ? "accent" : "primary"} />
            <View style={styles.flex}>
              <AppText variant="bodyStrong">{content.title}</AppText>
              <AppText variant="caption" color={COLORS.mutedForeground}>{content.body}</AppText>
            </View>
          </View>
          <Button title={content.action} variant="secondary" onPress={() => (content.key === "schedule" ? onTab("schedule") : openSection(content.key))} />
        </Panel>
      </FadeIn>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  avatar: { width: 46, height: 46, borderRadius: 15, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  hero: { borderRadius: 22, padding: SPACING.lg, gap: SPACING.xs, overflow: "hidden" },
  ring: { position: "absolute", end: -50, top: -60, width: 170, height: 170, borderRadius: 85, borderWidth: 24, borderColor: "rgba(255,255,255,0.08)" },
  ring2: { position: "absolute", end: 40, bottom: -50, width: 90, height: 90, borderRadius: 45, backgroundColor: "rgba(235,178,95,0.18)" },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 999, paddingHorizontal: SPACING.md, paddingVertical: 3, marginBottom: SPACING.xs },
  accent: { width: 44, height: 3, borderRadius: 2, backgroundColor: COLORS.accent, marginVertical: SPACING.xs },
  heroBtn: { marginTop: SPACING.xs },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.md },
  tabPanel: { paddingVertical: SPACING.lg, gap: SPACING.lg },
  tabRow: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.md },
});
