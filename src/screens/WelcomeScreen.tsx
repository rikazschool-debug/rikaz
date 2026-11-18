import React from "react";
import { Image, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BarChart3, ChevronLeft, ClipboardList, Clock, GraduationCap, Lock, UserRound, type LucideIcon } from "lucide-react-native";
import { RikazLogo } from "../components/RikazLogo";
import { FadeIn } from "../components/FadeIn";
import { AppText } from "../components/ui";
import type { AccountEntry } from "../components/AccountEntrySelector";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { pressScale } from "../lib/motion";
import { COLORS, LOGIN_COLORS, RADIUS, SHADOWS, SPACING, TOUCH } from "../theme/tokens";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const STUDENT_PHOTO = require("../../assets/welcome-student.jpg");

const ROLES: { key: AccountEntry; title: string; hint: string; icon: LucideIcon }[] = [
  { key: "student", title: "دخول الطالب", hint: "رقم الهوية ورقم الطالب", icon: GraduationCap },
  { key: "guardian", title: "دخول ولي الأمر", hint: "رقم الهوية ورمز التحقق", icon: UserRound },
  { key: "staff", title: "دخول الكادر التعليمي", hint: "المعلمون والإدارة المدرسية", icon: ClipboardList },
];

const FEATURES: { label: string; icon: LucideIcon }[] = [
  { label: "دخول آمن", icon: Lock },
  { label: "في أي وقت", icon: Clock },
  { label: "متابعة المستوى", icon: BarChart3 },
];

/** صفحة الترحيب المعتمدة: صورة الطالب أمام المدرسة، الشعار فقط، ثم اختيار طريقة الدخول. */
export const WelcomeScreen: React.FC<{ onSelect: (entry: AccountEntry) => void }> = ({ onSelect }) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const heroHeight = Math.min(Math.max(width * 1.08, 380), 480);
  const reduced = useReducedMotion();

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + SPACING.xl }} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { height: heroHeight }]}>
          <Image source={STUDENT_PHOTO} style={styles.photo} resizeMode="cover" accessibilityIgnoresInvertColors accessible={false} />
          <LinearGradient
            colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.55)", "rgba(255,255,255,0.92)"]}
            start={{ x: 0.15, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.heroText, { paddingTop: insets.top + SPACING.xxl }]}>
            <FadeIn style={styles.mark}>
              <View style={styles.logoTile} accessible accessibilityRole="header" accessibilityLabel="ركاز، منصة تعليمية متكاملة">
                <RikazLogo size={50} />
              </View>
              <View style={styles.chip}>
                <View style={styles.chipDot} />
                <AppText variant="micro" weight="bold" color={LOGIN_COLORS.primary}>
                  منصة تعليمية متكاملة
                </AppText>
              </View>
            </FadeIn>
            <AppText variant="title" color={LOGIN_COLORS.foreground} align="right" style={styles.greeting}>
              أهلاً بك في
            </AppText>
            <AppText weight="extrabold" color={LOGIN_COLORS.primary} align="right" style={styles.name}>
              ركاز
            </AppText>
            <AppText variant="caption" color={LOGIN_COLORS.foreground} align="right">
              منصتك لإثراء التعليم الذكي
            </AppText>
            <View style={styles.accentLine} />
          </View>
        </View>

        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.sheetHead}>
            <AppText variant="headline" color={LOGIN_COLORS.foreground}>
              اختر طريقة الدخول
            </AppText>
            <AppText variant="micro" color={LOGIN_COLORS.mutedForeground}>
              حسب نوع حسابك
            </AppText>
          </View>

          <View style={styles.cards} accessibilityRole="list">
            {ROLES.map((r) => {
              const Icon = r.icon;
              return (
                <FadeIn key={r.key}>
                  <Pressable
                    onPress={() => onSelect(r.key)}
                    accessibilityRole="button"
                    accessibilityLabel={`${r.title}، ${r.hint}`}
                    style={({ pressed }) => [styles.card, pressed && styles.cardPressed, { transform: [{ scale: pressScale(pressed, reduced) }] }]}
                  >
                    <View style={styles.cardIcon}>
                      <Icon size={22} color={LOGIN_COLORS.primary} />
                    </View>
                    <View style={styles.cardText}>
                      <AppText variant="bodyStrong" color={LOGIN_COLORS.foreground} align="right">
                        {r.title}
                      </AppText>
                      <AppText variant="micro" color={LOGIN_COLORS.mutedForeground} align="right">
                        {r.hint}
                      </AppText>
                    </View>
                    <View style={styles.chev}>
                      <ChevronLeft size={18} color={LOGIN_COLORS.primary} />
                    </View>
                  </Pressable>
                </FadeIn>
              );
            })}
          </View>

          <View style={styles.features}>
            {FEATURES.map(({ label, icon: Icon }) => (
              <View key={label} style={styles.feature}>
                <Icon size={15} color={LOGIN_COLORS.primary} />
                <AppText variant="micro" color={LOGIN_COLORS.mutedForeground}>
                  {label}
                </AppText>
              </View>
            ))}
          </View>

          <View style={styles.footer}>
            <View style={styles.footerRow}>
              <View style={styles.footerLine} />
              <AppText variant="label" color={LOGIN_COLORS.primary}>
                معاً… نحو مستقبل تعليمي أفضل
              </AppText>
              <View style={styles.footerLine} />
            </View>
            <AppText variant="micro" color={LOGIN_COLORS.mutedForeground} align="center">
              مجموعة المالكي التعليمية
            </AppText>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: LOGIN_COLORS.surface },
  hero: { width: "100%", overflow: "hidden", backgroundColor: COLORS.primaryTint },
  photo: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  heroText: { position: "absolute", top: 0, right: 0, width: "58%", paddingRight: SPACING.xl, alignItems: "flex-end", gap: SPACING.xxs },
  mark: { alignSelf: "center", alignItems: "center", gap: SPACING.sm, marginBottom: SPACING.lg },
  logoTile: { width: 74, height: 74, borderRadius: RADIUS.xl, backgroundColor: LOGIN_COLORS.surface, alignItems: "center", justifyContent: "center", ...SHADOWS.raised },
  chip: { flexDirection: "row-reverse", alignItems: "center", gap: SPACING.xs, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xxs + 1, borderRadius: RADIUS.full, backgroundColor: "rgba(255,255,255,0.92)", borderWidth: 1, borderColor: LOGIN_COLORS.border },
  chipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.accent },
  greeting: { marginTop: SPACING.xs },
  name: { fontSize: 56, lineHeight: 76 },
  accentLine: { width: 44, height: 3, borderRadius: 2, backgroundColor: COLORS.accent, marginTop: SPACING.sm },
  sheet: {
    marginTop: -RADIUS.xl - SPACING.sm,
    backgroundColor: LOGIN_COLORS.surface,
    borderTopLeftRadius: RADIUS.xl + SPACING.sm,
    borderTopRightRadius: RADIUS.xl + SPACING.sm,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    gap: SPACING.lg,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
  },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: LOGIN_COLORS.border },
  sheetHead: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  cards: { gap: SPACING.md },
  card: {
    minHeight: TOUCH.min + SPACING.xl,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: LOGIN_COLORS.surface,
    borderWidth: 1,
    borderColor: LOGIN_COLORS.border,
    ...SHADOWS.card,
  },
  cardPressed: { backgroundColor: LOGIN_COLORS.primaryTint, borderColor: LOGIN_COLORS.primary },
  cardIcon: { width: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: LOGIN_COLORS.primaryTint, alignItems: "center", justifyContent: "center" },
  cardText: { flex: 1, gap: SPACING.xxs },
  chev: { width: 32, height: 32, borderRadius: 16, backgroundColor: LOGIN_COLORS.surfaceLow, alignItems: "center", justifyContent: "center" },
  features: { flexDirection: "row-reverse", justifyContent: "space-between", paddingHorizontal: SPACING.xs },
  feature: { flexDirection: "row-reverse", alignItems: "center", gap: SPACING.xs },
  footer: { alignItems: "center", gap: SPACING.xs, marginTop: SPACING.xs },
  footerRow: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  footerLine: { width: 28, height: 2, borderRadius: 1, backgroundColor: COLORS.accent },
});
