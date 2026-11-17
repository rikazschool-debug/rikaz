import React from "react";
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ArrowLeftRight, Building2, ExternalLink, LayoutGrid } from "lucide-react-native";
import { AppText, Button, Card, IconTile } from "../components/ui";
import { RikazLogo } from "../components/RikazLogo";
import { useAuth } from "../hooks/useAuth";
import { ACCOUNT_KIND_LABEL, accountKind, contextLabel } from "../lib/contexts";
import { CONFIG } from "../config";
import { COLORS, RADIUS, SPACING, TOUCH } from "../theme/tokens";

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "صباح الخير" : "مساء الخير";
}

/** الرئيسية الأولية: الصفة النشطة والتبديل، دون روابط لأقسام لم تُنفّذ في التطبيق */
export const HomeScreen: React.FC<{ onSwitch: () => void }> = ({ onSwitch }) => {
  const insets = useSafeAreaInsets();
  const { active, fullName, contexts, switching, contextsLoading, reloadContexts } = useAuth();
  const firstName = fullName?.trim().split(/\s+/)[0];
  const kind = active ? accountKind(active.role) : "staff";
  const canSwitch = contexts.length > 1;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: SPACING.xxxl }}
      refreshControl={<RefreshControl refreshing={contextsLoading} onRefresh={() => void reloadContexts()} tintColor={COLORS.primaryForeground} colors={[COLORS.primary]} />}
    >
      <StatusBar style="light" />
      <View style={[styles.hero, { paddingTop: insets.top + SPACING.lg }]}>
        <View style={styles.heroTop}>
          <RikazLogo size={34} light />
          {canSwitch ? (
            <Pressable onPress={onSwitch} accessibilityRole="button" accessibilityLabel="تبديل المدرسة أو الصفة" hitSlop={TOUCH.hitSlop} style={({ pressed }) => [styles.switchChip, pressed && { opacity: 0.8 }]}>
              <ArrowLeftRight size={16} color={COLORS.primaryForeground} />
              <AppText variant="micro" color={COLORS.primaryForeground}>
                تبديل
              </AppText>
            </Pressable>
          ) : null}
        </View>
        <AppText variant="body" color={COLORS.onPrimaryMuted} style={styles.hello}>
          {greeting()}
        </AppText>
        <AppText variant="display" color={COLORS.primaryForeground} numberOfLines={2}>
          {firstName ? `أهلًا، ${firstName}` : "أهلًا بك"}
        </AppText>
      </View>

      <View style={styles.body}>
        <Card raised style={styles.ctxCard}>
          {active ? (
            <>
              <View style={styles.ctxRow}>
                <IconTile icon={Building2} size={52} />
                <View style={styles.flex}>
                  <AppText variant="micro" color={COLORS.mutedForeground}>
                    {ACCOUNT_KIND_LABEL[kind]}
                  </AppText>
                  <AppText variant="headline" numberOfLines={2}>
                    {active.schoolName || "المدرسة"}
                  </AppText>
                  {active.orgName ? (
                    <AppText variant="caption" color={COLORS.mutedForeground} numberOfLines={1}>
                      {active.orgName}
                    </AppText>
                  ) : null}
                </View>
              </View>
              <View style={styles.roleRow}>
                <View style={styles.rolePill}>
                  <AppText variant="label" color={COLORS.primary}>
                    {contextLabel(active)}
                  </AppText>
                </View>
                {switching ? <ActivityIndicator color={COLORS.primary} /> : null}
              </View>
              {canSwitch ? <Button title="تبديل المدرسة أو الصفة" variant="secondary" icon={ArrowLeftRight} onPress={onSwitch} /> : null}
            </>
          ) : (
            <ActivityIndicator color={COLORS.primary} />
          )}
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.ctxRow}>
            <IconTile icon={LayoutGrid} tone="accent" size={48} />
            <View style={styles.flex}>
              <AppText variant="bodyStrong">أقسام المدرسة</AppText>
              <AppText variant="caption" color={COLORS.mutedForeground}>
                تتوفر أقسام المدرسة حاليًا في منصة ركاز على الويب، وستُضاف إلى التطبيق تباعًا.
              </AppText>
            </View>
          </View>
          <Button
            title="فتح منصة ركاز"
            variant="ghost"
            icon={ExternalLink}
            accessibilityHint="يفتح المنصة في المتصفح، وقد يُطلب منك الدخول هناك"
            onPress={() => void Linking.openURL(`${CONFIG.platformUrl}/app`)}
          />
        </Card>

      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: COLORS.background },
  hero: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xxl,
    paddingBottom: SPACING.huge + SPACING.xl,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  switchChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    minHeight: 36,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.onPrimarySubtle,
  },
  hello: { marginTop: SPACING.xl },
  body: { paddingHorizontal: SPACING.lg, marginTop: -SPACING.huge, gap: SPACING.lg },
  ctxCard: { gap: SPACING.lg },
  ctxRow: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  roleRow: { flexDirection: "row", alignItems: "center", gap: SPACING.md, flexWrap: "wrap" },
  rolePill: { backgroundColor: COLORS.primaryTint, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xxs },
  sectionCard: { gap: SPACING.md },
});
