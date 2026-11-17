import React from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ArrowLeftRight, ChevronLeft, ExternalLink, LogOut, UserRound } from "lucide-react-native";
import { AppText, Button, Card, Divider, IconTile } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { ACCOUNT_KIND_LABEL, accountKind, contextLabel } from "../lib/contexts";
import { displayableEmail } from "../lib/identity";
import { CONFIG } from "../config";
import { COLORS, RADIUS, SPACING } from "../theme/tokens";
import type { LucideIcon } from "lucide-react-native";

const Row: React.FC<{ icon: LucideIcon; title: string; subtitle?: string; onPress: () => void }> = ({ icon, title, subtitle, onPress }) => (
  <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title} android_ripple={{ color: COLORS.primaryTint }} style={({ pressed }) => [styles.row, pressed && { backgroundColor: COLORS.muted }]}>
    <IconTile icon={icon} tone="muted" size={40} />
    <View style={styles.flex}>
      <AppText variant="bodyStrong">{title}</AppText>
      {subtitle ? (
        <AppText variant="caption" color={COLORS.mutedForeground} numberOfLines={2}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
    <ChevronLeft size={20} color={COLORS.mutedForeground} />
  </Pressable>
);

export const AccountScreen: React.FC<{ onSwitch: () => void }> = ({ onSwitch }) => {
  const insets = useSafeAreaInsets();
  const { session, fullName, active, contexts, signOut } = useAuth();
  const email = displayableEmail(session?.user?.email);
  const kind = active ? accountKind(active.role) : null;

  function confirmSignOut() {
    Alert.alert("تسجيل الخروج", "سيُمسح من هذا الجهاز كل ما يخص حسابك وصفتك الحالية.", [
      { text: "إلغاء", style: "cancel" },
      { text: "تسجيل الخروج", style: "destructive", onPress: () => void signOut() },
    ]);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACING.xl }]}>
      <StatusBar style="dark" />
      <AppText variant="title">حسابي</AppText>

      <Card style={styles.profile}>
        <View style={styles.avatar}>
          <UserRound size={30} color={COLORS.primary} />
        </View>
        <View style={styles.flex}>
          <AppText variant="headline" numberOfLines={2}>
            {fullName || "مستخدم ركاز"}
          </AppText>
          {email ? (
            <AppText variant="caption" color={COLORS.mutedForeground} style={styles.ltr} numberOfLines={1}>
              {email}
            </AppText>
          ) : null}
          {kind ? (
            <AppText variant="caption" color={COLORS.mutedForeground}>
              {ACCOUNT_KIND_LABEL[kind]}
            </AppText>
          ) : null}
        </View>
      </Card>

      <View style={styles.list}>
        {active ? (
          <Row
            icon={ArrowLeftRight}
            title="الصفة الحالية"
            subtitle={`${contextLabel(active)} — ${active.schoolName || "المدرسة"}${contexts.length > 1 ? ` · ${contexts.length} صفات` : ""}`}
            onPress={onSwitch}
          />
        ) : null}
        <Divider />
        <Row icon={ExternalLink} title="منصة ركاز على الويب" subtitle="لإدارة بياناتك وبقية الأقسام" onPress={() => void Linking.openURL(`${CONFIG.platformUrl}/app/profile`)} />
      </View>

      <Button title="تسجيل الخروج" variant="destructive" icon={LogOut} onPress={confirmSignOut} style={{ marginTop: SPACING.sm }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxxl, gap: SPACING.lg },
  profile: { flexDirection: "row", alignItems: "center", gap: SPACING.lg },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primaryTint, alignItems: "center", justifyContent: "center" },
  ltr: { writingDirection: "ltr" },
  list: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: SPACING.md, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, minHeight: 68 },
});
