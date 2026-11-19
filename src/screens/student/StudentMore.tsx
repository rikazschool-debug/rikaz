import React, { useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowLeft, Award, Bell, BookOpenCheck, CalendarCheck, CalendarDays, ClipboardCheck, ClipboardList, DoorOpen, ExternalLink, Globe, LifeBuoy, Megaphone,
  MessagesSquare, PartyPopper, School, ShieldCheck, type LucideIcon,
} from "lucide-react-native";
import { AppText } from "../../components/ui";
import { openSection, WEB_HINT } from "../../components/StudentKit";
import { SBadge, SHeader, SScreen, SSearch, SSection, sStyles } from "../../components/student/SKit";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { pressScale } from "../../lib/motion";
import { groupSections, SECTION_GROUP_LABEL, sectionLabel, sectionsFor, type SectionGroup, type SectionKey } from "../../lib/sections";
import { CONFIG } from "../../config";
import { servicesLabel } from "../../lib/studentDay";
import type { StudentSub, StudentTab } from "./StudentHome";
import { R, S, SHADOW } from "../../theme/student";
import { SPACING } from "../../theme/tokens";

const ICON: Partial<Record<SectionKey, LucideIcon>> = {
  classrooms: School, homework: ClipboardList, schedule: CalendarDays, pickup: DoorOpen, communication: MessagesSquare,
  notifications: Bell, events: PartyPopper, tests: ClipboardCheck, support: LifeBuoy, hub_notices: Megaphone, attendance: CalendarCheck,
};
const HINT: Partial<Record<SectionKey, string>> = {
  classrooms: "مقرراتك ودروسك", homework: "حل وتسليم المهام", schedule: "حصص اليوم والأسبوع", pickup: "طلبات الخروج المبكر",
  communication: "معلموك ومجموعاتك", notifications: "تنبيهات الإدارة والصف", events: "معارض ورحلات ومسابقات", tests: "اختباراتك ومواعيدها",
  support: "الأسئلة الشائعة والتذاكر",
};
const GROUP_ICON: Record<SectionGroup, LucideIcon> = { learning: BookOpenCheck, communication: MessagesSquare, care: ShieldCheck, school: School };
/** أقسام لها شاشة داخل التطبيق؛ البقية تفتح في المنصة. */
const IN_APP: Partial<Record<SectionKey, { sub?: StudentSub; tab?: StudentTab }>> = {
  homework: { sub: "homework" }, tests: { sub: "homework" }, schedule: { tab: "schedule" }, communication: { tab: "comm" },
  classrooms: { sub: "classrooms" }, pickup: { sub: "pickup" }, events: { sub: "events" }, notifications: { sub: "notifications" },
};
const MINE: { sub: StudentSub; label: string; hint: string; icon: LucideIcon }[] = [
  { sub: "results", label: "الدرجات والنتائج", hint: "نتائجك المنشورة", icon: Award },
  { sub: "attendance", label: "الحضور والغياب", hint: "تقويم المواظبة", icon: CalendarCheck },
];

type Item = { id: string; label: string; hint?: string; icon: LucideIcon; web: boolean; onPress: () => void };
export const filterItems = <T extends { label: string; hint?: string }>(items: T[], q: string): T[] => {
  const t = q.trim();
  return t ? items.filter((i) => i.label.includes(t) || (i.hint ?? "").includes(t)) : items;
};

const Card: React.FC<{ it: Item }> = ({ it }) => {
  const reduced = useReducedMotion();
  const Icon = it.icon;
  return (
    <Pressable onPress={it.onPress} accessibilityRole={it.web ? "link" : "button"} accessibilityLabel={it.label} accessibilityHint={it.web ? WEB_HINT : undefined}
      style={({ pressed }) => [st.card, pressed && st.pressed, { transform: [{ scale: pressScale(pressed, reduced) }] }]}>
      <View style={st.cardTop}>
        <View style={st.well}><Icon size={26} color={S.primary} /></View>
        {it.web ? <ExternalLink size={16} color={S.muted} /> : <ArrowLeft size={16} color={S.muted} />}
      </View>
      <AppText variant="bodyStrong" weight="bold" color={S.ink} numberOfLines={2}>{it.label}</AppText>
      {it.hint ? <AppText variant="micro" color={S.text2} numberOfLines={1}>{it.hint}</AppText> : null}
    </Pressable>
  );
};

export const StudentMore: React.FC<{ onOpen: (s: StudentSub) => void; onTab: (t: StudentTab) => void }> = ({ onOpen, onTab }) => {
  const [q, setQ] = useState("");
  const toItem = (k: SectionKey): Item => {
    const inApp = IN_APP[k];
    return { id: k, label: sectionLabel(k, "student"), hint: HINT[k], icon: ICON[k] ?? ClipboardList, web: !inApp,
      onPress: () => (inApp?.sub ? onOpen(inApp.sub) : inApp?.tab ? onTab(inApp.tab) : openSection(k)) };
  };
  const groups = [
    { id: "mine", title: "ملفي الدراسي", icon: Award, items: MINE.map((m) => ({ id: m.sub, label: m.label, hint: m.hint, icon: m.icon, web: false, onPress: () => onOpen(m.sub) })) },
    ...groupSections(sectionsFor("student", null)).map((g) => ({ id: g.group, title: SECTION_GROUP_LABEL[g.group], icon: GROUP_ICON[g.group], items: g.keys.map(toItem) })),
  ].map((g) => ({ ...g, items: filterItems(g.items, q) })).filter((g) => g.items.length);

  return (
    <SScreen>
      <SHeader eyebrow="كل الأقسام" />
      <SSearch value={q} onChange={setQ} placeholder="ابحث عن قسم أو خدمة مدرسية…" label="البحث في الأقسام" />
      {groups.length ? groups.map((g) => (
        <View key={g.id} style={st.group}>
          <SSection title={g.title} icon={g.icon} end={<SBadge label={servicesLabel(g.items.length)} tone="blue" />} />
          <View style={sStyles.grid2}>{g.items.map((it) => <Card key={it.id} it={it} />)}</View>
        </View>
      )) : (
        <View style={st.empty}><AppText variant="bodyStrong" color={S.ink} align="center">لا توجد أقسام مطابقة</AppText><AppText variant="caption" color={S.text2} align="center">جرّب كلمة أخرى.</AppText></View>
      )}

      <Pressable onPress={() => void Linking.openURL(CONFIG.platformUrl)} accessibilityRole="link" accessibilityLabel="منصة ركاز على الويب" accessibilityHint={WEB_HINT}>
        {({ pressed }) => (
          <LinearGradient colors={["#14614F", S.primary]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={[st.web, pressed && { opacity: 0.92 }]}>
            <View style={st.webTop}>
              <View style={st.webIcon}><Globe size={22} color={S.onPrimary} /></View>
              <View style={sStyles.flex}>
                <AppText variant="micro" color={S.onPrimaryMuted}>بوابة المتصفح الموحدة</AppText>
                <AppText variant="headline" weight="bold" color={S.onPrimary}>منصة ركاز على الويب</AppText>
              </View>
              <ExternalLink size={20} color={S.onPrimary} />
            </View>
            <AppText variant="caption" color={S.onPrimaryMuted}>لبقية الأقسام والتقارير وإدارة بياناتك من حاسوبك.</AppText>
            <View style={st.webCta}><AppText variant="label" weight="bold" color="#6AD9C4">زيارة المنصة</AppText><ArrowLeft size={16} color="#6AD9C4" /></View>
          </LinearGradient>
        )}
      </Pressable>
    </SScreen>
  );
};

const st = StyleSheet.create({
  group: { gap: SPACING.md },
  card: { flexBasis: "46%", flexGrow: 1, minHeight: 150, backgroundColor: S.surface, borderRadius: R.card, borderWidth: 1, borderColor: S.hairline, padding: SPACING.lg, gap: 4, ...SHADOW.l1 },
  pressed: { backgroundColor: S.mint, borderColor: S.mintStrong },
  cardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: SPACING.sm },
  well: { width: 56, height: 56, borderRadius: 28, backgroundColor: S.mint, alignItems: "center", justifyContent: "center" },
  empty: { paddingVertical: SPACING.xxl, gap: 4 },
  web: { borderRadius: R.card, padding: SPACING.xl, gap: SPACING.md, overflow: "hidden", ...SHADOW.l2 },
  webTop: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  webIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: S.onPrimarySubtle, alignItems: "center", justifyContent: "center" },
  webCta: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-end" },
});
