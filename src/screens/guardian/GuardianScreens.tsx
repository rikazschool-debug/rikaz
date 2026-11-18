import React, { useEffect, useMemo, useState } from "react";
import { Alert, BackHandler, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Award, Bell, BookOpen, CalendarCheck, CalendarDays, ClipboardList, DoorOpen, Home, IdCard, LayoutGrid, LifeBuoy, LogOut, MessagesSquare,
  PartyPopper, Repeat, School, Users, Wallet, type LucideIcon,
} from "lucide-react-native";
import { BottomBar, type BottomItem } from "../../components/BottomBar";
import { AppText, Button, Notice } from "../../components/ui";
import { Chips, IconTileBox, ListRow, openSection, Panel, ScreenTitle, SectionTitle, SegmentTabs } from "../../components/StudentKit";
import { FadeIn } from "../../components/FadeIn";
import { fetchMyProfile, type MyProfile } from "../../api/profile";
import { canFollow, fetchFamilyChildren, type FamilyChild } from "../../api/student";
import type { Conversation } from "../../api/family";
import { useAuth } from "../../hooks/useAuth";
import { maskNationalId, maskPhone } from "../../lib/mask";
import { StudentScope } from "../student/useStudentData";
import { StudentAttendance } from "../student/StudentAttendance";
import { StudentSchedule } from "../student/StudentSchedule";
import { StudentHomework } from "../student/StudentHomework";
import { Classrooms } from "../shared/Classrooms";
import { ConversationList, NewChat, Thread } from "../shared/Conversations";
import { NotificationsList } from "../shared/Notifications";
import { Events } from "../shared/Events";
import { GuardianPickup } from "../shared/Pickup";
import { ChildFinance, Circulars, FamilyRequests, Visits } from "./GuardianExtras";
import { COLORS, RADIUS, SPACING } from "../../theme/tokens";

export type GuardianTab = "account" | "comm" | "home" | "kids" | "more";
const TABS: BottomItem<GuardianTab>[] = [
  { key: "account", label: "حسابي", icon: IdCard },
  { key: "comm", label: "التواصل", icon: MessagesSquare },
  { key: "home", label: "الرئيسية", icon: Home, center: true },
  { key: "kids", label: "أبنائي", icon: Users },
  { key: "more", label: "المزيد", icon: LayoutGrid },
];

/** أقسام داخل التطبيق؛ «ابن» = تخص الابن المختار. */
type Sub = "attendance" | "schedule" | "homework" | "classrooms" | "finance" | "pickup" | "visits" | "requests" | "events" | "thread" | "newchat";
const SUB: Record<Exclude<Sub, "thread" | "newchat">, { label: string; hint: string; icon: LucideIcon; child?: boolean }> = {
  attendance: { label: "الحضور والغياب", hint: "تقويم المواظبة", icon: CalendarCheck, child: true },
  schedule: { label: "الجدول", hint: "حصص اليوم والأسبوع", icon: CalendarDays, child: true },
  homework: { label: "الواجبات والاختبارات", hint: "المطلوب والمسلّم", icon: ClipboardList, child: true },
  classrooms: { label: "الفصول الرقمية", hint: "الدروس والمنشورات", icon: School },
  finance: { label: "البيانات المالية", hint: "الرصيد والمدفوعات", icon: Wallet, child: true },
  pickup: { label: "الخروج والاستئذان", hint: "استلام واستئذان", icon: DoorOpen },
  visits: { label: "الزيارات", hint: "مواعيد المدرسة", icon: CalendarDays },
  requests: { label: "طلبات ولي الأمر", hint: "طلباتك للمدرسة", icon: ClipboardList },
  events: { label: "الأنشطة والفعاليات", hint: "الرحلات والموافقات", icon: PartyPopper },
};
const QUICK: (keyof typeof SUB)[] = ["attendance", "homework", "schedule", "pickup", "visits", "requests"];
const KID_ROWS: (keyof typeof SUB)[] = ["attendance", "schedule", "homework", "classrooms", "finance"];
const MORE: { title: string; keys: (keyof typeof SUB)[] }[] = [
  { title: "اليوم الدراسي", keys: ["attendance", "schedule", "homework", "classrooms", "pickup"] },
  { title: "المتابعة والطلبات", keys: ["visits", "requests", "finance", "events"] },
];

/** ولي الأمر: أبناؤه الموثّقون في المدرسة النشطة كما تعيدهم المنصة؛ لا أسماء أو أرقام مصطنعة. */
export function GuardianShell({ onSwitch }: { onSwitch: () => void }) {
  const { active, fullName, contexts, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [tab, setTabRaw] = useState<GuardianTab>("home");
  const [sub, setSub] = useState<Sub | null>(null);
  const [conv, setConv] = useState<Conversation | null>(null);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [kidsAll, setKids] = useState<FamilyChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState("");
  const [commTab, setCommTab] = useState<"chats" | "notifications" | "circulars">("chats");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exitError, setExitError] = useState(false);
  const schoolId = active?.schoolId;
  const setTab = (t: GuardianTab) => { setSub(null); setTabRaw(t); };

  useEffect(() => {
    let alive = true;
    setFailed(false); setLoading(true);
    Promise.all([fetchMyProfile(schoolId), fetchFamilyChildren()])
      .then(([p, k]) => { if (alive) { setProfile(p); setKids(k); } })
      .catch(() => { if (alive) setFailed(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [schoolId, revision]);

  const here = useMemo(() => kidsAll.filter((k) => k.school_id === schoolId), [kidsAll, schoolId]);
  const kids = here.filter(canFollow);
  const pending = here.filter((k) => !canFollow(k));
  useEffect(() => { if (kids.length && !kids.some((k) => k.student_id === selected)) setSelected(kids[0]!.student_id); }, [kids, selected]);
  const child = kids.find((k) => k.student_id === selected);

  useEffect(() => {
    const h = BackHandler.addEventListener("hardwareBackPress", () => {
      if (confirm) { setConfirm(false); return true; }
      if (sub === "thread" || sub === "newchat") { setSub(null); setConv(null); return true; }
      if (sub) { setSub(null); return true; }
      if (tab !== "home") { setTabRaw("home"); return true; }
      return false;
    });
    return () => h.remove();
  }, [tab, sub, confirm]);

  const name = profile?.full_name || fullName || "ولي الأمر";
  const back = () => { setSub(null); setConv(null); };
  async function leave() { setBusy(true); setExitError(!(await signOut())); setBusy(false); }
  function askLeave() {
    if (Platform.OS === "web") { setConfirm(true); return; }
    Alert.alert("تسجيل الخروج", "هل تريد تسجيل الخروج من حسابك؟", [{ text: "إلغاء", style: "cancel" }, { text: "تسجيل الخروج", style: "destructive", onPress: () => void leave() }]);
  }

  // الشاشات الفرعية داخل التطبيق
  const scoped = (el: React.ReactNode) => (child ? <StudentScope studentId={child.student_id} schoolId={child.school_id}>{el}</StudentScope> : null);
  let screen: React.ReactNode = null;
  if (sub === "thread" && conv) screen = <Thread conv={conv} onBack={back} />;
  else if (sub === "newchat") screen = <NewChat role="guardian" onBack={back} onCreated={(id) => { setConv({ id, title: "محادثة جديدة", kind: "family" }); setSub("thread"); }} />;
  else if (sub === "attendance") screen = scoped(<StudentAttendance onBack={back} />);
  else if (sub === "schedule") screen = scoped(<StudentSchedule onBack={back} />);
  else if (sub === "homework") screen = scoped(<StudentHomework onBack={back} />);
  else if (sub === "finance" && child) screen = <ChildFinance studentId={child.student_id} name={child.student ?? ""} onBack={back} />;
  else if (sub === "classrooms") screen = <Classrooms onBack={back} canComment={false} />;
  else if (sub === "pickup") screen = <GuardianPickup onBack={back} initialChild={child?.student_id} />;
  else if (sub === "visits") screen = <Visits kids={kids} onBack={back} />;
  else if (sub === "requests") screen = <FamilyRequests kids={kids} onBack={back} />;
  else if (sub === "events") screen = <Events onBack={back} />;

  const go = (k: keyof typeof SUB) => setSub(k);
  const tile = (k: keyof typeof SUB) => {
    const s = SUB[k];
    const off = !!s.child && !child;
    return (
      <Pressable key={k} accessibilityRole="button" accessibilityLabel={s.label} accessibilityState={{ disabled: off }} disabled={off} onPress={() => go(k)} style={({ pressed }) => [styles.tile, pressed && styles.tilePressed, off && { opacity: 0.5 }]}>
        <IconTileBox icon={s.icon} />
        <AppText variant="label" weight="bold" align="center" numberOfLines={2}>{s.label}</AppText>
      </Pressable>
    );
  };
  const childPicker = kids.length > 1 ? <Chips label="الأبناء" value={selected} onChange={setSelected} items={kids.map((k) => ({ key: k.student_id, label: k.student ?? "" }))} /> : null;
  const title = { home: name, kids: "أبنائي", comm: "التواصل والمحادثات", more: "المزيد", account: "حسابي" }[tab];
  const eyebrow = { home: "متابعة أبنائك", kids: "متابعة الأبناء", comm: "المدرسة والمعلمون", more: "كل الأقسام", account: "بيانات ولي الأمر" }[tab];

  return (
    <View style={styles.flex}>
      <View style={styles.flex}>
        {screen ?? (
          <ScrollView style={styles.screen} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => setRevision((v) => v + 1)} tintColor={COLORS.primary} />} contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACING.md, paddingBottom: SPACING.xxxl }]}>
            <StatusBar style="dark" />
            <ScreenTitle title={title} eyebrow={eyebrow} />
            {failed ? <Notice tone="warning">تعذر تحميل بياناتك الآن.</Notice> : null}
            {failed ? <Button title="إعادة المحاولة" variant="secondary" onPress={() => setRevision((v) => v + 1)} /> : null}
            {!loading && !failed && !kids.length && tab !== "account" && tab !== "comm" ? (
              <Notice tone="info">{pending.length ? "ستظهر بيانات أبنائك بعد توثيق المدرسة للعلاقة." : "لا يوجد أبناء مرتبطون بحسابك في هذه المدرسة. تواصل مع المدرسة لربطهم."}</Notice>
            ) : null}
            {tab === "home" || tab === "kids" ? childPicker : null}

            {tab === "home" ? (
              <>
                <View style={styles.hero}>
                  <AppText variant="caption" color={COLORS.onPrimaryMuted}>{active?.schoolName || "مدرستك"}</AppText>
                  <AppText variant="title" weight="extrabold" color={COLORS.primaryForeground}>{child?.student || "متابعة الأبناء"}</AppText>
                  <AppText variant="caption" color={COLORS.onPrimaryMuted}>{child?.grade ? `${child.grade} · شعبة ${child.section ?? ""}` : "اليوم الدراسي · الواجبات · الحضور"}</AppText>
                  <Button title="أبنائي" variant="secondary" icon={Users} onPress={() => setTab("kids")} />
                </View>
                <SectionTitle title="متابعة سريعة" />
                <View style={styles.grid}>{QUICK.map(tile)}</View>
                <SectionTitle title="التواصل مع المدرسة" />
                <Panel>
                  <ListRow first icon={MessagesSquare} title="التواصل والمحادثات" onPress={() => { setCommTab("chats"); setTab("comm"); }} />
                  <ListRow icon={Bell} title="الإشعارات" onPress={() => { setCommTab("notifications"); setTab("comm"); }} />
                  <ListRow icon={PartyPopper} title="الأنشطة والفعاليات" onPress={() => go("events")} />
                </Panel>
              </>
            ) : null}

            {tab === "kids" ? (
              <>
                {child ? (
                  <Panel>
                    <ListRow first icon={Users} title={child.student ?? ""} subtitle={[child.grade, child.section ? `شعبة ${child.section}` : null, child.relationship].filter(Boolean).join(" · ") || active?.schoolName} />
                    {KID_ROWS.map((k) => <ListRow key={k} icon={SUB[k].icon} title={SUB[k].label} subtitle={SUB[k].hint} onPress={() => go(k)} />)}
                  </Panel>
                ) : null}
                {pending.length ? (
                  <>
                    <SectionTitle title="بانتظار توثيق المدرسة" />
                    <Panel>{pending.map((k, i) => <ListRow key={k.student_id} first={i === 0} icon={Users} title={k.student ?? "بانتظار توثيق العلاقة"} subtitle="ستظهر البيانات بعد توثيق المدرسة للعلاقة" />)}</Panel>
                  </>
                ) : null}
                <SectionTitle title="على منصة ركاز" caption="تفتح في المنصة" />
                <Panel>
                  <ListRow first icon={Award} title="نظام التقييم الشامل" web onPress={() => openSection("evaluation")} />
                  <ListRow icon={BookOpen} title="الخطط العلاجية" web onPress={() => openSection("remedial_plans")} />
                </Panel>
              </>
            ) : null}

            {tab === "comm" ? (
              <>
                <SegmentTabs label="التواصل" value={commTab} onChange={setCommTab} items={[{ key: "chats", label: "المحادثات" }, { key: "notifications", label: "الإشعارات" }, { key: "circulars", label: "التعاميم" }]} />
                <FadeIn key={commTab}>
                  {commTab === "chats" ? <ConversationList role="guardian" onOpen={(c) => { setConv(c); setSub("thread"); }} onNew={() => setSub("newchat")} /> : commTab === "notifications" ? <NotificationsList /> : <Circulars />}
                </FadeIn>
              </>
            ) : null}

            {tab === "more" ? (
              <>
                {MORE.map((g) => (
                  <View key={g.title} style={styles.group}>
                    <SectionTitle title={g.title} />
                    <View style={styles.grid}>{g.keys.map(tile)}</View>
                  </View>
                ))}
                <SectionTitle title="على منصة ركاز" caption="تفتح في المنصة" />
                <Panel>
                  <ListRow first icon={Award} title="نظام التقييم الشامل" web onPress={() => openSection("evaluation")} />
                  <ListRow icon={BookOpen} title="الخطط العلاجية" web onPress={() => openSection("remedial_plans")} />
                </Panel>
              </>
            ) : null}

            {tab === "account" ? (
              <>
                <View style={styles.hero}>
                  <AppText variant="title" weight="extrabold" color={COLORS.primaryForeground}>{name}</AppText>
                  <AppText variant="caption" color={COLORS.onPrimaryMuted}>{`ولي أمر · ${active?.schoolName ?? ""}`}</AppText>
                </View>
                <Panel>
                  <View style={styles.info}><AppText variant="caption" color={COLORS.mutedForeground}>رقم الهوية</AppText><AppText variant="label" style={styles.ltr}>{maskNationalId(profile?.national_id) || "غير مسجل"}</AppText></View>
                  <View style={styles.info}><AppText variant="caption" color={COLORS.mutedForeground}>الجوال</AppText><AppText variant="label" style={styles.ltr}>{maskPhone(profile?.phone) || "غير مسجل"}</AppText></View>
                  <ListRow icon={School} title="المدرسة" subtitle={active?.schoolName || "غير مسجلة"} />
                </Panel>
                <SectionTitle title="الأبناء المرتبطون" />
                <Panel>
                  {here.map((k, i) => <ListRow key={k.student_id} first={i === 0} icon={Users} title={k.student ?? "بانتظار توثيق العلاقة"} subtitle={canFollow(k) ? [k.grade, k.section].filter(Boolean).join(" · ") || undefined : "بانتظار توثيق المدرسة"} onPress={canFollow(k) ? () => { setSelected(k.student_id); setTab("kids"); } : undefined} />)}
                  {!here.length ? <AppText style={styles.empty} color={COLORS.mutedForeground}>{loading ? "جارٍ التحميل…" : "لا يوجد أبناء مرتبطون في هذه المدرسة"}</AppText> : null}
                </Panel>
                <Panel>
                  {contexts.length > 1 ? <ListRow first icon={Repeat} title="تبديل الصفة" onPress={onSwitch} /> : null}
                  <ListRow first={contexts.length <= 1} icon={LifeBuoy} title="الدعم والمساعدة" web onPress={() => openSection("support")} />
                </Panel>
                {exitError ? <Notice tone="error">تعذر تسجيل الخروج. حاول مرة أخرى.</Notice> : null}
                {confirm ? (
                  <View style={styles.group}>
                    <AppText>تأكيد تسجيل الخروج</AppText>
                    <Button title="إلغاء" variant="secondary" onPress={() => setConfirm(false)} />
                    <Button title="تأكيد الخروج" variant="destructive" loading={busy} onPress={() => void leave()} />
                  </View>
                ) : <Button title="تسجيل الخروج" variant="destructive" icon={LogOut} loading={busy} onPress={askLeave} />}
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
  hero: { backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, padding: SPACING.xl, gap: SPACING.sm },
  tile: { flexBasis: "30%", flexGrow: 1, minHeight: 112, padding: SPACING.sm, backgroundColor: COLORS.card, borderColor: COLORS.border, borderWidth: 1, borderRadius: RADIUS.lg, alignItems: "center", justifyContent: "center", gap: SPACING.xs },
  tilePressed: { backgroundColor: COLORS.primaryTint },
  info: { paddingVertical: SPACING.md, gap: SPACING.xs, borderBottomColor: COLORS.border, borderBottomWidth: 1 },
  ltr: { writingDirection: "ltr", textAlign: "right" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  group: { gap: SPACING.md },
  empty: { paddingVertical: SPACING.lg },
});
