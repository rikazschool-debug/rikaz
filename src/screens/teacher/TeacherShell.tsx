import React, { useEffect, useState } from "react";
import { BackHandler, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Award, Bell, BookOpen, Briefcase, CalendarDays, ClipboardCheck, ClipboardList, HeartHandshake, Home, IdCard, LayoutGrid, MessagesSquare,
  PartyPopper, School, ShieldCheck, Sparkles, UsersRound, type LucideIcon,
} from "lucide-react-native";
import { BottomBar, type BottomItem } from "../../components/BottomBar";
import { AppText } from "../../components/ui";
import { IconTileBox, ScreenTitle, SectionTitle, SegmentTabs } from "../../components/StudentKit";
import { FadeIn } from "../../components/FadeIn";
import type { Conversation } from "../../api/family";
import type { Lesson } from "../../api/teacher";
import { useAuth } from "../../hooks/useAuth";
import { schoolDate, riyadhToday } from "../../lib/studentData";
import type { EduKind } from "../../lib/teacherData";
import { AccountScreen } from "../AccountScreen";
import { Classrooms } from "../shared/Classrooms";
import { ConversationList, Thread } from "../shared/Conversations";
import { NotificationsList } from "../shared/Notifications";
import { Events } from "../shared/Events";
import { EduRecords, LessonAttendance, TeacherDuties, TeacherHomework, TeacherMeetings, TeacherSchedule, TeacherTasks, TodayLessons } from "./TeacherSections";
import { COLORS, RADIUS, SPACING } from "../../theme/tokens";

export type TeacherTab = "account" | "comm" | "home" | "schedule" | "more";
const TABS: BottomItem<TeacherTab>[] = [
  { key: "account", label: "حسابي", icon: IdCard },
  { key: "comm", label: "التواصل", icon: MessagesSquare },
  { key: "home", label: "الرئيسية", icon: Home, center: true },
  { key: "schedule", label: "جدولي", icon: CalendarDays },
  { key: "more", label: "المزيد", icon: LayoutGrid },
];

/** أقسام المعلم كما في قائمة المنصة (NAV_BY_ROLE.teacher + الأقسام الإضافية للمعلم). */
type Sec = "lessons" | "homework" | "classrooms" | "tasks" | "duties" | "meetings" | "events" | EduKind;
const SEC: Record<Sec, { label: string; icon: LucideIcon }> = {
  lessons: { label: "تحضير الحصص", icon: ClipboardCheck },
  homework: { label: "الواجبات والاختبارات", icon: ClipboardList },
  classrooms: { label: "الفصول الرقمية", icon: School },
  tasks: { label: "التكليفات", icon: Briefcase },
  duties: { label: "المناوبات", icon: ShieldCheck },
  meetings: { label: "الاجتماعات", icon: UsersRound },
  events: { label: "الأنشطة والفعاليات", icon: PartyPopper },
  referral: { label: "التوجيه الطلابي", icon: HeartHandshake },
  talent: { label: "رعاية الموهوبين", icon: Sparkles },
  student_plan: { label: "الخطط العلاجية", icon: BookOpen },
  supervision: { label: "الإشراف التربوي", icon: Award },
};
const QUICK: Sec[] = ["lessons", "homework", "classrooms", "tasks", "duties", "meetings"];
const MORE: { title: string; keys: Sec[] }[] = [
  { title: "اليوم الدراسي", keys: ["lessons", "homework", "classrooms"] },
  { title: "العمل المدرسي", keys: ["tasks", "duties", "meetings", "events"] },
  { title: "المتابعة والرعاية", keys: ["referral", "talent", "student_plan", "supervision"] },
];

export function TeacherShell({ onSwitch }: { onSwitch: () => void }) {
  const { active, fullName } = useAuth();
  const insets = useSafeAreaInsets();
  const [tab, setTabRaw] = useState<TeacherTab>("home");
  const [sec, setSec] = useState<Sec | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [conv, setConv] = useState<Conversation | null>(null);
  const [commTab, setCommTab] = useState<"chats" | "notifications">("chats");
  const [rev, setRev] = useState(0);
  const setTab = (t: TeacherTab) => { setSec(null); setLesson(null); setConv(null); setTabRaw(t); };
  const back = () => { if (lesson) { setLesson(null); setRev((v) => v + 1); } else { setSec(null); setConv(null); } };

  useEffect(() => {
    const h = BackHandler.addEventListener("hardwareBackPress", () => {
      if (lesson || sec || conv) { back(); return true; }
      if (tab !== "home") { setTabRaw("home"); return true; }
      return false;
    });
    return () => h.remove();
  }, [tab, sec, lesson, conv]);

  let screen: React.ReactNode = null;
  if (lesson) screen = <LessonAttendance lesson={lesson} onBack={back} />;
  else if (conv) screen = <Thread conv={conv} onBack={back} />;
  else if (sec === "lessons") screen = <TodayLessons key={rev} onBack={back} onOpen={setLesson} />;
  else if (sec === "homework") screen = <TeacherHomework onBack={back} />;
  else if (sec === "classrooms") screen = <Classrooms onBack={back} canComment={false} />;
  else if (sec === "tasks") screen = <TeacherTasks onBack={back} />;
  else if (sec === "duties") screen = <TeacherDuties onBack={back} />;
  else if (sec === "meetings") screen = <TeacherMeetings onBack={back} />;
  else if (sec === "events") screen = <Events onBack={back} />;
  else if (sec) screen = <EduRecords kind={sec} onBack={back} />;
  else if (tab === "account") screen = <AccountScreen onSwitch={onSwitch} />;
  else if (tab === "schedule") screen = <TeacherSchedule />;

  const tile = (k: Sec) => (
    <Pressable key={k} accessibilityRole="button" accessibilityLabel={SEC[k].label} onPress={() => setSec(k)} style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}>
      <IconTileBox icon={SEC[k].icon} />
      <AppText variant="label" weight="bold" align="center" numberOfLines={2}>{SEC[k].label}</AppText>
    </Pressable>
  );
  const name = fullName || "المعلم";

  return (
    <View style={styles.flex}>
      <View style={styles.flex}>
        {screen ?? (
          <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACING.md, paddingBottom: SPACING.xxxl }]}>
            <StatusBar style="dark" />
            {tab === "home" ? (
              <>
                <ScreenTitle eyebrow="مساحة المعلم" title={name} />
                <View style={styles.hero}>
                  <AppText variant="caption" color={COLORS.onPrimaryMuted}>{active?.schoolName || "مدرستك"}</AppText>
                  <AppText variant="title" weight="extrabold" color={COLORS.primaryForeground}>حصص اليوم</AppText>
                  <AppText variant="caption" color={COLORS.onPrimaryMuted}>{schoolDate(riyadhToday())}</AppText>
                </View>
                <TodayLessons key={rev} embedded onOpen={setLesson} />
                <SectionTitle title="وصول سريع" />
                <View style={styles.grid}>{QUICK.map(tile)}</View>
              </>
            ) : null}
            {tab === "comm" ? (
              <>
                <ScreenTitle eyebrow="الطلاب وأولياء الأمور والإدارة" title="التواصل والمحادثات" />
                <SegmentTabs label="التواصل" value={commTab} onChange={setCommTab} items={[{ key: "chats", label: "المحادثات" }, { key: "notifications", label: "الإشعارات" }]} />
                <FadeIn key={commTab}>{commTab === "chats" ? <ConversationList role="teacher" onOpen={setConv} /> : <NotificationsList />}</FadeIn>
              </>
            ) : null}
            {tab === "more" ? (
              <>
                <ScreenTitle eyebrow="كل الأقسام" title="المزيد" />
                {MORE.map((g) => (
                  <View key={g.title} style={styles.group}>
                    <SectionTitle title={g.title} />
                    <View style={styles.grid}>{g.keys.map(tile)}</View>
                  </View>
                ))}
              </>
            ) : null}
          </ScrollView>
        )}
      </View>
      <BottomBar items={TABS} value={tab} onChange={setTab} />
    </View>
  );
}




const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: "#F7F8F6" },
  content: { paddingHorizontal: SPACING.xl, gap: SPACING.lg, width: "100%", maxWidth: 600, alignSelf: "center" },
  hero: { backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, padding: SPACING.xl, gap: SPACING.xs },
  tile: { flexBasis: "30%", flexGrow: 1, minHeight: 112, padding: SPACING.sm, backgroundColor: COLORS.card, borderColor: COLORS.border, borderWidth: 1, borderRadius: RADIUS.lg, alignItems: "center", justifyContent: "center", gap: SPACING.xs },
  tilePressed: { backgroundColor: COLORS.primaryTint },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  group: { gap: SPACING.md },
});
