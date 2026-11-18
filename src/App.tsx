import React, { useEffect, useState } from "react";
import { ActivityIndicator, BackHandler, I18nManager, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { Cairo_400Regular, Cairo_500Medium, Cairo_600SemiBold, Cairo_700Bold, Cairo_800ExtraBold, useFonts } from "@expo-google-fonts/cairo";
import { CalendarDays, Home, LayoutGrid, MessagesSquare, UserRound, type LucideIcon } from "lucide-react-native";
import { BottomBar, type BottomItem } from "./components/BottomBar";
import { StudentHome, type StudentSub, type StudentTab } from "./screens/student/StudentHome";
import { StudentHomework } from "./screens/student/StudentHomework";
import { StudentResults } from "./screens/student/StudentResults";
import { StudentAttendance } from "./screens/student/StudentAttendance";
import { StudentComm } from "./screens/student/StudentComm";
import { StudentSchedule } from "./screens/student/StudentSchedule";
import { StudentMore } from "./screens/student/StudentMore";
import { StudentAccount } from "./screens/student/StudentAccount";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { LoginScreen } from "./screens/LoginScreen";
import { ChooseContextScreen } from "./screens/ChooseContextScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { AccountScreen } from "./screens/AccountScreen";
import { RikazLogo } from "./components/RikazLogo";
import { COLORS, FONT_SCALE, FONTS, SPACING } from "./theme/tokens";

// نسخة المتصفح تتبع اتجاه التطبيق نفسه حتى تطابق المعاينة الجوال
if (Platform.OS === "web" && typeof document !== "undefined") {
  document.documentElement.dir = "rtl";
  document.documentElement.lang = "ar";
}

// الواجهة عربية بالكامل: اتجاه من اليمين لليسار (يسري بعد أول إعادة فتح للتطبيق إن لم يكن مفعّلًا)
if (!I18nManager.isRTL) {
  try {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(true);
  } catch {
    // لا شيء
  }
}

type Tab = "home" | "account";

const Splash: React.FC = () => (
  <View style={styles.center}>
    <RikazLogo size={64} />
    <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
  </View>
);

const TabBar: React.FC<{ tab: Tab; onChange: (t: Tab) => void }> = ({ tab, onChange }) => {
  const insets = useSafeAreaInsets();
  const items: { key: Tab; label: string; icon: LucideIcon }[] = [
    { key: "home", label: "الرئيسية", icon: Home },
    { key: "account", label: "حسابي", icon: UserRound },
  ];
  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, SPACING.sm) }]} accessibilityRole="tablist">
      {items.map((it) => {
        const on = it.key === tab;
        const Icon = it.icon;
        return (
          <Pressable key={it.key} onPress={() => onChange(it.key)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={it.label} style={styles.tabItem}>
            <View style={[styles.tabIndicator, on && styles.tabIndicatorOn]}>
              <Icon size={22} color={on ? COLORS.primary : COLORS.mutedForeground} strokeWidth={on ? 2.2 : 1.8} />
            </View>
            <Text maxFontSizeMultiplier={FONT_SCALE.control} style={[styles.tabLabel, { color: on ? COLORS.primary : COLORS.mutedForeground, fontFamily: on ? FONTS.bold : FONTS.medium }]}>
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

// الترتيب يبدأ من اليمين: حسابي، التواصل، الرئيسية (المنتصف)، الجدول، المزيد
const STUDENT_TABS: BottomItem<StudentTab>[] = [
  { key: "account", label: "حسابي", icon: UserRound },
  { key: "comm", label: "التواصل", icon: MessagesSquare },
  { key: "home", label: "الرئيسية", icon: Home, center: true },
  { key: "schedule", label: "الجدول", icon: CalendarDays },
  { key: "more", label: "المزيد", icon: LayoutGrid },
];

const StudentShell: React.FC<{ onSwitch: () => void }> = ({ onSwitch }) => {
  const [tab, setTabRaw] = useState<StudentTab>("home");
  const [sub, setSub] = useState<StudentSub | null>(null);
  const setTab = (t: StudentTab) => {
    setSub(null);
    setTabRaw(t);
  };
  useEffect(() => {
    if (tab === "home" && !sub) return;
    const h = BackHandler.addEventListener("hardwareBackPress", () => {
      if (sub) setSub(null);
      else setTabRaw("home");
      return true;
    });
    return () => h.remove();
  }, [tab, sub]);
  const back = () => setSub(null);
  return (
    <View style={styles.flex}>
      <View style={styles.flex}>
        {sub === "homework" ? <StudentHomework onBack={back} />
          : sub === "results" ? <StudentResults onBack={back} />
          : sub === "attendance" ? <StudentAttendance onBack={back} />
          : tab === "home" ? <StudentHome onTab={setTab} onOpen={setSub} />
          : tab === "comm" ? <StudentComm />
          : tab === "schedule" ? <StudentSchedule />
          : tab === "more" ? <StudentMore onOpen={setSub} onTab={setTab} />
          : <StudentAccount onSwitch={onSwitch} />}
      </View>
      <BottomBar items={STUDENT_TABS} value={tab} onChange={setTab} />
    </View>
  );
};

const Root: React.FC = () => {
  const { status, mustChoose, active, contextsLoading, contextsError, contexts } = useAuth();
  const [tab, setTab] = useState<Tab>("home");
  const [picker, setPicker] = useState(false);

  // زر الرجوع في أندرويد يغلق شاشة التبديل أولًا
  useEffect(() => {
    if (!picker) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setPicker(false);
      return true;
    });
    return () => sub.remove();
  }, [picker]);

  // العودة للرئيسية وإغلاق التبديل عند الخروج
  useEffect(() => {
    if (status !== "signedIn") {
      setTab("home");
      setPicker(false);
    }
  }, [status]);

  if (status === "loading") return <Splash />;
  if (status === "signedOut") return <LoginScreen />;
  if (contextsLoading && contexts.length === 0) return <Splash />;
  if (mustChoose || !active || contextsError) return <ChooseContextScreen />;
  if (picker) return <ChooseContextScreen onClose={() => setPicker(false)} />;

  if (active.role === "student") return <StudentShell onSwitch={() => setPicker(true)} />;

  return (
    <View style={styles.flex}>
      <View style={styles.flex}>{tab === "home" ? <HomeScreen onSwitch={() => setPicker(true)} /> : <AccountScreen onSwitch={() => setPicker(true)} />}</View>
      <TabBar tab={tab} onChange={setTab} />
    </View>
  );
};

export default function App() {
  const [fontsLoaded, fontError] = useFonts({ Cairo_400Regular, Cairo_500Medium, Cairo_600SemiBold, Cairo_700Bold, Cairo_800ExtraBold });
  return (
    <SafeAreaProvider>
      {fontsLoaded || fontError ? (
        <AuthProvider>
          <Root />
        </AuthProvider>
      ) : (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background },
  tabBar: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    shadowColor: COLORS.foreground,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  tabItem: { flex: 1, alignItems: "center", gap: 2, minHeight: 56 },
  tabIndicator: { width: 64, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  tabIndicatorOn: { backgroundColor: COLORS.primaryTint },
  tabLabel: { fontSize: 12, lineHeight: 18 },
});
