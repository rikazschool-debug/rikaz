import React from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeftRight, Briefcase, Building2, GraduationCap, Users } from "lucide-react-native";
import { AppText, Card, Notice, SectionHeader, StatusPill } from "../components/ui";
import { RikazLogo } from "../components/RikazLogo";
import { useAuth } from "../hooks/useAuth";
import { ACCOUNT_KIND_LABEL, accountKind, contextLabel } from "../lib/contexts";
import { RoleSections } from "../components/RoleSections";
import { CONFIG } from "../config";
import { COLORS, RADIUS, SHADOWS, SPACING, TOUCH } from "../theme/tokens";
import { formatAuthFailure } from "../lib/authDiagnostics";

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "صباح الخير" : "مساء الخير";
}

function initial(name: string | null | undefined): string {
  return name?.trim().charAt(0) || "ر";
}

/** الرئيسية بتخطيط المرجع: ترحيب، بطاقة الحساب، بطاقة الصفة النشطة، ثم أقسام الدور */
export const HomeScreen: React.FC<{ onSwitch: () => void }> = ({ onSwitch }) => {
  const insets = useSafeAreaInsets();
  const { active, fullName, contexts, switching, contextsLoading, contextFailure, reloadContexts, perms } = useAuth();
  const firstName = fullName?.trim().split(/\s+/)[0];
  const kind = active ? accountKind(active.role) : "staff";
  const KindIcon = kind === "guardian" ? Users : kind === "student" ? GraduationCap : Briefcase;
  const canSwitch = contexts.length > 1;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACING.lg }]}
      refreshControl={<RefreshControl refreshing={contextsLoading} onRefresh={() => void reloadContexts()} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
    >
      <StatusBar style="dark" />

      <View style={styles.topBar}>
        <View style={styles.logoTile}>
          <RikazLogo size={30} />
        </View>
        <View style={styles.flex}>
          <AppText variant="caption" color={COLORS.mutedForeground}>
            {greeting()}
          </AppText>
          <AppText variant="title" numberOfLines={1}>
            {firstName ? `أهلًا، ${firstName}` : "أهلًا بك"}
          </AppText>
        </View>
        {canSwitch ? (
          <Pressable onPress={onSwitch} accessibilityRole="button" accessibilityLabel="تبديل المدرسة أو الصفة" hitSlop={TOUCH.hitSlop} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
            <ArrowLeftRight size={20} color={COLORS.primary} />
          </Pressable>
        ) : null}
      </View>

      <Card raised style={styles.profile}>
        <View style={styles.avatar}>
          <AppText variant="title" color={COLORS.primary}>
            {initial(fullName)}
          </AppText>
        </View>
        <View style={styles.flex}>
          <AppText variant="headline" numberOfLines={2}>
            {fullName || "مستخدم ركاز"}
          </AppText>
          {active ? (
            <AppText variant="caption" color={COLORS.mutedForeground} numberOfLines={2}>
              {contextLabel(active)}
            </AppText>
          ) : null}
        </View>
        <StatusPill label="نشط الآن" />
      </Card>

      {active ? (
        <LinearGradient colors={[COLORS.primary, COLORS.primaryPressed]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={styles.feature}>
          <View style={styles.featureTop}>
            <View style={styles.featureChip}>
              <KindIcon size={14} color={COLORS.primaryForeground} />
              <AppText variant="micro" color={COLORS.primaryForeground}>
                {ACCOUNT_KIND_LABEL[kind]}
              </AppText>
            </View>
            {switching ? <ActivityIndicator color={COLORS.primaryForeground} /> : null}
          </View>
          <View style={styles.featureRow}>
            <View style={styles.flex}>
              <AppText variant="title" color={COLORS.primaryForeground} numberOfLines={2}>
                {active.schoolName || "المدرسة"}
              </AppText>
              {active.orgName ? (
                <AppText variant="caption" color={COLORS.onPrimaryMuted} numberOfLines={1}>
                  {active.orgName}
                </AppText>
              ) : null}
            </View>
            <View style={styles.featureIcon}>
              <Building2 size={26} color={COLORS.primaryForeground} />
            </View>
          </View>
          {canSwitch ? (
            <Pressable onPress={onSwitch} accessibilityRole="button" accessibilityLabel="تبديل المدرسة أو الصفة" style={({ pressed }) => [styles.featureAction, pressed && styles.pressed]}>
              <ArrowLeftRight size={16} color={COLORS.primary} />
              <AppText variant="label" color={COLORS.primary}>
                تبديل المدرسة أو الصفة
              </AppText>
            </Pressable>
          ) : null}
        </LinearGradient>
      ) : (
        <ActivityIndicator color={COLORS.primary} />
      )}

      {contextFailure ? (
        <Notice tone="error" title="تعذر تحميل سياق الحساب">
          {formatAuthFailure(contextFailure)}
        </Notice>
      ) : null}
      {active && CONFIG.readOnlyLoginTest ? (
        <Notice tone="warning" title="اختبار محافظ على البيانات">
          يُعرض السياق من العضويات المقروءة فقط. لم نحدّث السياق النشط أو نحمّل صلاحيات الخادم.
        </Notice>
      ) : null}
      {active ? (
        <View style={styles.sections}>
          <SectionHeader title="أقسامك" caption="حسب صفتك وصلاحياتك في المدرسة" />
          <RoleSections role={active.role} perms={perms} loading={switching} />
        </View>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxxl, gap: SPACING.lg, width: "100%", maxWidth: 720, alignSelf: "center" },
  topBar: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  logoTile: { width: 48, height: 48, borderRadius: RADIUS.md, backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.card },
  iconBtn: { width: TOUCH.min, height: TOUCH.min, borderRadius: TOUCH.min / 2, backgroundColor: COLORS.primaryTint, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.75 },
  profile: { flexDirection: "row", alignItems: "center", gap: SPACING.md, padding: SPACING.lg },
  avatar: { width: 56, height: 56, borderRadius: RADIUS.lg, backgroundColor: COLORS.primaryTint, alignItems: "center", justifyContent: "center" },
  feature: { borderRadius: RADIUS.xl, padding: SPACING.xl, gap: SPACING.lg, ...SHADOWS.raised },
  featureTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  featureChip: { flexDirection: "row", alignItems: "center", gap: SPACING.xs, backgroundColor: COLORS.onPrimarySubtle, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xxs + 1 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  featureIcon: { width: 56, height: 56, borderRadius: RADIUS.lg, backgroundColor: COLORS.onPrimarySubtle, alignItems: "center", justifyContent: "center" },
  featureAction: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: SPACING.sm, minHeight: TOUCH.min, borderRadius: RADIUS.md, backgroundColor: COLORS.primaryForeground },
  sections: { gap: SPACING.md, marginTop: SPACING.xs },
});
