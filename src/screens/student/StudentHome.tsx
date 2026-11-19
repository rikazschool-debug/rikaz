import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  BookOpen, CalendarDays, Clock, ClipboardList, DoorOpen, FileQuestion, Laptop, MessagesSquare, PartyPopper, Search, Sparkles, type LucideIcon,
} from "lucide-react-native";
import { AppText } from "../../components/ui";
import { FadeIn } from "../../components/FadeIn";
import { DataState } from "../../components/StudentKit";
import { SBadge, SCard, SPillTabs, SScreen, SSection, SWell, sStyles } from "../../components/student/SKit";
import { NotificationsList } from "../shared/Notifications";
import { useAuth } from "../../hooks/useAuth";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { pressScale } from "../../lib/motion";
import { fetchHomework, fetchOverview } from "../../api/student";
import { hm, lessonsOn, riyadhWeekday, type HomeworkRow } from "../../lib/studentData";
import { currentOrNext, dueLabel, riyadhMinutes, summarize, upcomingWork } from "../../lib/studentDay";
import { useStudentProfile } from "./useStudentProfile";
import { useStudentQuery } from "./useStudentData";
import { R, S, SHADOW } from "../../theme/student";
import { SPACING } from "../../theme/tokens";

type Tab = "today" | "homework" | "notices";
export type StudentTab = "account" | "comm" | "home" | "schedule" | "more";
/** شاشات بيانات الطالب داخل التطبيق. */
export type StudentSub = "homework" | "results" | "attendance" | "classrooms" | "pickup" | "events" | "notifications";

const greeting = () => (new Date().getHours() < 12 ? "صباح الخير" : "مساء الخير");
function todayLabel(): string {
  try {
    return new Intl.DateTimeFormat("ar-SA-u-nu-latn", { timeZone: "Asia/Riyadh", weekday: "long", day: "numeric", month: "long" }).format(new Date());
  } catch {
    return "";
  }
}
const until = (min: number) => (min <= 1 ? "تبدأ الآن" : min < 60 ? `بعد ${min} دقيقة` : `بعد ${Math.floor(min / 60)} س ${min % 60 ? `${min % 60} د` : ""}`.trim());

const Tile: React.FC<{ icon: LucideIcon; label: string; hint: string; hintTone?: "amber" | "mint"; onPress: () => void }> = ({ icon: Icon, label, hint, hintTone, onPress }) => {
  const reduced = useReducedMotion();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}، ${hint}`}
      style={({ pressed }) => [st.tile, pressed && st.tilePressed, { transform: [{ scale: pressScale(pressed, reduced) }] }]}>
      <View style={st.tileWell}><Icon size={26} color={S.primary} /></View>
      <AppText variant="bodyStrong" weight="bold" color={S.ink} align="center" numberOfLines={2}>{label}</AppText>
      <AppText variant="micro" weight={hintTone ? "semibold" : "regular"} color={hintTone === "amber" ? S.amber : hintTone === "mint" ? S.secondary : S.text2} align="center" numberOfLines={1}>{hint}</AppText>
    </Pressable>
  );
};

const WorkRow: React.FC<{ r: HomeworkRow; now: number; onPress: () => void }> = ({ r, now, onPress }) => {
  const test = r.kind === "test";
  const due = dueLabel(r.effective_due, now);
  return (
    <SCard onPress={onPress} label={`${r.title}، ${r.subject}، ${due.label}`} style={st.work}>
      <SWell icon={test ? FileQuestion : BookOpen} tone={test ? "mint" : "amber"} round />
      <View style={sStyles.flex}>
        <AppText variant="bodyStrong" weight="bold" color={S.ink} numberOfLines={2}>{r.title}</AppText>
        <AppText variant="caption" color={S.text2} numberOfLines={1}>{`${r.subject} • ${test ? "الاختبار" : "التسليم"} ${due.label}`}</AppText>
      </View>
      <SBadge label={due.label} tone={due.tone === "accent" ? "amber" : due.tone === "danger" ? "danger" : "muted"} />
    </SCard>
  );
};

export const StudentHome: React.FC<{ onTab: (t: StudentTab) => void; onOpen: (s: StudentSub) => void }> = ({ onTab, onOpen }) => {
  const { fullName, active } = useAuth();
  const { profile } = useStudentProfile();
  const ov = useStudentQuery((_, id) => fetchOverview(id));
  const hw = useStudentQuery((_, id) => fetchHomework(id));
  const [tab, setTab] = useState<Tab>("today");
  const now = Date.now();
  const nowMin = riyadhMinutes();
  const weekday = riyadhWeekday(new Date());
  const today = useMemo(() => lessonsOn(ov.data?.timetable ?? [], weekday), [ov.data, weekday]);
  const sum = summarize(today, nowMin);
  const cur = currentOrNext(today, nowMin);
  const work = upcomingWork(hw.data ?? [], now);
  const dueToday = upcomingWork(hw.data ?? [], now, 0);
  const homeworkOnly = work.filter((r) => (r.kind ?? "homework") === "homework");
  const name = profile?.full_name || fullName;
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  const display = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : name || "طالب ركاز";
  const section = ov.data?.student.section || profile?.section;
  const classes = ov.data?.classrooms?.length ?? 0;

  const list = tab === "today" ? dueToday : homeworkOnly.slice(0, 5);

  return (
    <SScreen>
      <View style={sStyles.row}>
        <View style={st.avatar}>
          <AppText weight="bold" color={S.onPrimary} style={st.avatarText}>{name?.trim().charAt(0) || "ر"}</AppText>
          <View style={st.online} />
        </View>
        <View style={sStyles.flex}>
          <AppText variant="caption" color={S.text2}>{`${greeting()} 👋`}</AppText>
          <AppText variant="headline" weight="bold" color={S.ink} numberOfLines={1}>{display}</AppText>
        </View>
        <Pressable onPress={() => onTab("more")} accessibilityRole="button" accessibilityLabel="البحث في الأقسام" style={({ pressed }) => [st.round, pressed && { backgroundColor: S.mintStrong }]}>
          <Search size={22} color={S.ink} />
        </Pressable>
      </View>

      <FadeIn>
        <LinearGradient colors={["#14614F", S.primary, "#0A3A31"]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={st.hero}>
          <View style={st.glow} />
          <View style={st.heroTop}>
            <View style={st.heroChip}>
              <Clock size={14} color={S.mintStrong} />
              <AppText variant="micro" weight="semibold" color={S.mintStrong} numberOfLines={1}>
                {cur ? (cur.live ? "تجري الآن" : `الحصة القادمة • ${until(cur.startsIn)}`) : today.length ? "انتهت حصص اليوم" : "يومك الدراسي"}
              </AppText>
            </View>
            <AppText variant="micro" color={S.onPrimaryMuted} numberOfLines={1} style={st.heroDate}>{todayLabel()}</AppText>
          </View>
          {ov.loading ? (
            <AppText variant="title" weight="bold" color={S.onPrimary}>جارٍ تحميل يومك…</AppText>
          ) : cur ? (
            <>
              <AppText variant="caption" color={S.onPrimaryMuted}>{cur.live ? "الحصة الحالية" : "مادتك التالية"}</AppText>
              <AppText weight="bold" color={S.onPrimary} style={st.heroTitle} numberOfLines={2}>{cur.slot.subject}</AppText>
              <AppText variant="caption" color={S.onPrimaryMuted} numberOfLines={2}>
                {[cur.slot.period, cur.slot.start ? `${hm(cur.slot.start)} - ${hm(cur.slot.end)}` : null, cur.slot.teacher].filter(Boolean).join(" • ")}
              </AppText>
            </>
          ) : (
            <>
              <AppText weight="bold" color={S.onPrimary} style={st.heroTitle} numberOfLines={2}>{today.length ? "أحسنت، أنهيت يومك" : active?.schoolName || "مدرستك"}</AppText>
              <AppText variant="caption" color={S.onPrimaryMuted}>{today.length ? "راجع واجباتك واستعد للغد." : "لا توجد حصص منشورة لهذا اليوم."}</AppText>
            </>
          )}
          <View style={st.heroBottom}>
            {section ? <View style={st.sectionChip}><AppText variant="micro" weight="semibold" color={S.onPrimary} numberOfLines={1}>{section}</AppText></View> : <View />}
            {today.length ? <AppText variant="micro" color={S.onPrimaryMuted}>{`أنهيت ${sum.done} من ${sum.total} حصص اليوم`}</AppText> : null}
          </View>
          {today.length ? (
            <View style={st.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: sum.total, now: sum.done }}>
              <View style={[st.fill, { width: `${Math.round((sum.done / sum.total) * 100)}%` }]} />
            </View>
          ) : null}
          <Pressable onPress={() => onTab("schedule")} accessibilityRole="button" accessibilityLabel="فتح الجدول" style={StyleSheet.absoluteFill} />
        </LinearGradient>
      </FadeIn>

      <SSection title="مهام سريعة" />
      <View style={st.grid}>
        <Tile icon={ClipboardList} label="الواجبات" hint={homeworkOnly.length ? `${homeworkOnly.length} مطلوبة` : "مذكرة الواجبات"} hintTone={homeworkOnly.length ? "amber" : undefined} onPress={() => onOpen("homework")} />
        <Tile icon={CalendarDays} label="جدولي" hint="اليوم" onPress={() => onTab("schedule")} />
        <Tile icon={Laptop} label="الفصول الرقمية" hint={classes ? `${classes} مقررات` : "مقرراتك"} onPress={() => onOpen("classrooms")} />
        <Tile icon={DoorOpen} label="الاستئذان" hint="طلب خروج" onPress={() => onOpen("pickup")} />
        <Tile icon={MessagesSquare} label="المحادثات" hint="رسائلك" hintTone="mint" onPress={() => onTab("comm")} />
        <Tile icon={PartyPopper} label="الفعاليات" hint="أنشطة المدرسة" onPress={() => onOpen("events")} />
      </View>

      <SPillTabs label="يومك" value={tab} onChange={setTab} items={[{ key: "today", label: "اليوم" }, { key: "homework", label: "الواجبات" }, { key: "notices", label: "الإشعارات" }]} />
      <FadeIn key={tab}>
        {tab === "notices" ? (
          <NotificationsList />
        ) : (
          <DataState loading={hw.loading} error={hw.error} missing={hw.missing} empty={!list.length}
            emptyTitle={tab === "today" ? "لا يوجد ما يستحق اليوم" : "لا توجد واجبات مطلوبة"} emptyHint={tab === "today" ? "سيظهر هنا ما يُسلَّم أو يُختبر اليوم." : undefined} onRetry={hw.reload}>
            <View style={st.list}>{list.map((r) => <WorkRow key={r.id} r={r} now={now} onPress={() => onOpen("homework")} />)}</View>
          </DataState>
        )}
      </FadeIn>

      {sum.total > 0 && sum.done === sum.total ? (
        <View style={st.cheer}>
          <SWell icon={Sparkles} tone="mint" round size={44} />
          <View style={sStyles.flex}>
            <AppText variant="bodyStrong" weight="bold" color={S.ink}>{`استمر في تألقك، ${parts[0] ?? ""}!`}</AppText>
            <AppText variant="caption" color={S.text2}>أنهيت كل حصص اليوم.</AppText>
          </View>
        </View>
      ) : null}
    </SScreen>
  );
};

const st = StyleSheet.create({
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: S.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 28, lineHeight: 40 },
  online: { position: "absolute", bottom: 2, start: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: S.secondary, borderWidth: 2, borderColor: S.surface },
  round: { width: 52, height: 52, borderRadius: 26, backgroundColor: S.mint, alignItems: "center", justifyContent: "center" },
  hero: { borderRadius: R.card + 8, padding: SPACING.xl, gap: SPACING.xs, overflow: "hidden", ...SHADOW.l2 },
  glow: { position: "absolute", start: -60, top: -80, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(255,255,255,0.06)" },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.sm, marginBottom: SPACING.sm },
  heroChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: S.onPrimarySubtle, borderRadius: R.chip, paddingHorizontal: SPACING.md, paddingVertical: 4, flexShrink: 1 },
  heroDate: { flexShrink: 1 },
  heroTitle: { fontSize: 34, lineHeight: 50 },
  heroBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.sm, marginTop: SPACING.md },
  sectionChip: { backgroundColor: S.onPrimarySubtle, borderRadius: R.chip, paddingHorizontal: SPACING.md, paddingVertical: 2, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" },
  track: { height: 6, borderRadius: 3, backgroundColor: S.onPrimarySubtle, overflow: "hidden", marginTop: SPACING.sm },
  fill: { height: 6, borderRadius: 3, backgroundColor: "#6AD9C4" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.md },
  tile: { flexBasis: "30%", flexGrow: 1, minHeight: 150, backgroundColor: S.surface, borderRadius: R.tile, borderWidth: 1, borderColor: S.hairline, padding: SPACING.md, alignItems: "center", justifyContent: "center", gap: 4, ...SHADOW.l1 },
  tilePressed: { backgroundColor: S.mint, borderColor: S.mintStrong },
  tileWell: { width: 64, height: 64, borderRadius: 12, backgroundColor: S.mint, alignItems: "center", justifyContent: "center", marginBottom: SPACING.xs },
  list: { gap: SPACING.md },
  work: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  cheer: { flexDirection: "row", alignItems: "center", gap: SPACING.md, backgroundColor: S.mint, borderRadius: R.tile, padding: SPACING.lg },
});
