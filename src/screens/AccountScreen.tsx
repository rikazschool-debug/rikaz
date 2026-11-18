import React, { useState } from "react";
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ArrowLeftRight, ChevronLeft, ExternalLink, LogOut, UserRound } from "lucide-react-native";
import { AppText, Button, Card, Divider, IconTile, Notice, SectionHeader, StatusPill } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { ACCOUNT_KIND_LABEL, accountKind, contextLabel } from "../lib/contexts";
import { displayableEmail } from "../lib/identity";
import { CONFIG } from "../config";
import { COLORS, RADIUS, SHADOWS, SPACING } from "../theme/tokens";
import type { LucideIcon } from "lucide-react-native";

const Row: React.FC<{ icon: LucideIcon; title: string; subtitle?: string; onPress: () => void }> = ({ icon, title, subtitle, onPress }) => (
  <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title} android_ripple={{ color: COLORS.primaryTint }} style={({ pressed }) => [styles.row, pressed && { backgroundColor: COLORS.muted }]}>
    <IconTile icon={icon} tone="primary" size={44} />
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
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);
  const email = displayableEmail(session?.user?.email);
  const kind = active ? accountKind(active.role) : null;

  async function performSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutFailed(false);
    const succeeded = await signOut();
    if (!succeeded) setSignOutFailed(true);
    setSigningOut(false);
  }

  function confirmSignOut() {
    setSignOutFailed(false);
    if (Platform.OS === "web") {
      setConfirmingSignOut(true);
      return;
    }
    Alert.alert("تسجيل الخروج", "سيُمسح من هذا الجهاز كل ما يخص حسابك وصفتك الحالية.", [
      { text: "إلغاء", style: "cancel" },
      { text: "تسجيل الخروج", style: "destructive", onPress: () => void performSignOut() },
    ]);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACING.xl }]}>
      <StatusBar style="dark" />
      <AppText variant="title">حسابي</AppText>

      <Card raised style={styles.profile}>
        <View style={styles.avatar}>
          {fullName?.trim() ? (
            <AppText variant="title" color={COLORS.primary}>
              {fullName.trim().charAt(0)}
            </AppText>
          ) : (
            <UserRound size={30} color={COLORS.primary} />
          )}
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
          {kind ? <StatusPill label={ACCOUNT_KIND_LABEL[kind]} tone="primary" style={styles.kindPill} /> : null}
        </View>
      </Card>

      <SectionHeader title="الحساب والصفة" style={styles.listHead} />
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

      {signOutFailed ? (
        <Notice tone="error" title="تعذر تسجيل الخروج">
          تعذّر إنهاء الجلسة على هذا الجهاز. حاول مرة أخرى.
        </Notice>
      ) : null}
      {Platform.OS === "web" && confirmingSignOut ? (
        <Card style={styles.signOutConfirm}>
          <AppText variant="label">تأكيد تسجيل الخروج</AppText>
          <AppText variant="caption" color={COLORS.mutedForeground}>
            ستُنهي الجلسة في هذا المتصفح فقط، دون تعديل بيانات المدرسة.
          </AppText>
          <View style={styles.confirmActions}>
            <Button
              title="إلغاء"
              variant="secondary"
              disabled={signingOut}
              onPress={() => setConfirmingSignOut(false)}
            />
            <Button
              title="تأكيد الخروج"
              variant="destructive"
              loading={signingOut}
              onPress={() => void performSignOut()}
            />
          </View>
        </Card>
      ) : (
        <Button
          title="تسجيل الخروج"
          variant="destructive"
          icon={LogOut}
          onPress={confirmSignOut}
          loading={signingOut}
          disabled={signingOut}
          style={{ marginTop: SPACING.sm }}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxxl, gap: SPACING.lg },
  profile: { flexDirection: "row", alignItems: "center", gap: SPACING.lg },
  kindPill: { marginTop: SPACING.xs },
  listHead: { marginBottom: -SPACING.sm },
  avatar: { width: 64, height: 64, borderRadius: RADIUS.lg, backgroundColor: COLORS.primaryTint, alignItems: "center", justifyContent: "center" },
  ltr: { writingDirection: "ltr" },
  list: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: "hidden", ...SHADOWS.card },
  row: { flexDirection: "row", alignItems: "center", gap: SPACING.md, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, minHeight: 68 },
  signOutConfirm: { gap: SPACING.md },
  confirmActions: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
});
