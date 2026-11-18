import React, { useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { BadgeCheck, GraduationCap, IdCard, LogOut, Mail, MessageSquareMore, Repeat, ShieldCheck, Smartphone, UserRound, type LucideIcon } from "lucide-react-native";
import { AppText, Button, Notice } from "../../components/ui";
import { ListRow, openSection, Panel, ScreenTitle, studentStyles } from "../../components/StudentKit";
import { useAuth } from "../../hooks/useAuth";
import { maskNationalId, maskPhone } from "../../lib/mask";
import { displayableEmail } from "../../lib/identity";
import { useStudentProfile } from "./useStudentProfile";
import { COLORS, SPACING } from "../../theme/tokens";

const InfoRow: React.FC<{ icon: LucideIcon; label: string; value: string | null | undefined; ltr?: boolean; first?: boolean }> = ({ icon: Icon, label, value, ltr, first }) => (
  <View style={[styles.info, !first && styles.border]} accessible accessibilityLabel={`${label}: ${value || "غير مسجل"}`}>
    <Icon size={17} color={COLORS.primary} />
    <AppText variant="caption" color={COLORS.mutedForeground} style={styles.label}>{label}</AppText>
    <AppText variant="label" weight="bold" color={value ? COLORS.foreground : COLORS.mutedForeground} style={[styles.value, ltr && value ? styles.ltr : null]} numberOfLines={2}>
      {value || "غير مسجل"}
    </AppText>
  </View>
);

/** حسابي للطالب: الحقول نفسها في الملف الشخصي بالمنصة (قراءة فقط). */
export const StudentAccount: React.FC<{ onSwitch: () => void }> = ({ onSwitch }) => {
  const insets = useSafeAreaInsets();
  const { fullName, active, contexts, signOut } = useAuth();
  const { profile, failed } = useStudentProfile();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);
  const name = profile?.full_name || fullName;
  const email = displayableEmail(profile?.email ?? undefined);

  async function doSignOut() {
    setBusy(true);
    setSignOutFailed(false);
    if (!(await signOut())) setSignOutFailed(true);
    setBusy(false);
  }
  function askSignOut() {
    if (Platform.OS === "web") return setConfirm(true);
    Alert.alert("تسجيل الخروج", "سيُمسح من هذا الجهاز كل ما يخص حسابك وصفتك الحالية.", [
      { text: "إلغاء", style: "cancel" },
      { text: "تسجيل الخروج", style: "destructive", onPress: () => void doSignOut() },
    ]);
  }

  return (
    <ScrollView style={studentStyles.screen} contentContainerStyle={[studentStyles.content, { paddingTop: insets.top + SPACING.md, paddingBottom: SPACING.xxxl }]}>
      <StatusBar style="dark" />
      <ScreenTitle title="حسابي" />
      <View style={styles.card}>
        <View style={styles.photo}>
          <AppText weight="extrabold" color={COLORS.primaryForeground} style={styles.initial}>{name?.trim().charAt(0) || "ر"}</AppText>
        </View>
        <View style={styles.flex}>
          <AppText variant="headline" weight="extrabold" numberOfLines={2}>{name || "طالب ركاز"}</AppText>
          <AppText variant="caption" color={COLORS.mutedForeground} numberOfLines={2}>{profile?.section ? `طالب · ${profile.section}` : "طالب"}</AppText>
          <View style={styles.ok}>
            <ShieldCheck size={12} color={COLORS.success} />
            <AppText variant="micro" weight="bold" color={COLORS.success}>حساب موثّق</AppText>
          </View>
        </View>
      </View>

      <View style={styles.head}>
        <AppText variant="bodyStrong" weight="extrabold" accessibilityRole="header">الملف الشخصي</AppText>
        <AppText variant="micro" color={COLORS.mutedForeground}>بياناتك كما سجلتها المدرسة</AppText>
      </View>
      {failed ? <Notice tone="warning">تعذر تحميل بعض بياناتك الآن. اسحب الصفحة لاحقًا للمحاولة مجددًا.</Notice> : null}
      <Panel>
        <InfoRow first icon={UserRound} label="الاسم" value={name} />
        <InfoRow icon={BadgeCheck} label="الحساب" value={active?.schoolName ? `طالب — ${active.schoolName}` : "طالب"} />
        <InfoRow icon={IdCard} label="رقم الهوية" value={maskNationalId(profile?.national_id)} ltr />
        <InfoRow icon={Smartphone} label="الجوال" value={maskPhone(profile?.phone)} ltr />
        <InfoRow icon={Mail} label="البريد" value={email} ltr />
        <InfoRow icon={GraduationCap} label="المرحلة / الصف / الشعبة" value={profile?.section} />
      </Panel>
      <AppText variant="micro" color={COLORS.mutedForeground}>لتصحيح أي بيان تواصل مع إدارة المدرسة.</AppText>

      <AppText variant="bodyStrong" weight="extrabold" accessibilityRole="header">الحساب والصفة</AppText>
      <Panel>
        {contexts.length > 1 ? <ListRow first icon={Repeat} title="تبديل الصفة" subtitle={active?.schoolName ? `طالب · ${active.schoolName}` : undefined} onPress={onSwitch} /> : null}
        <ListRow first={contexts.length <= 1} icon={MessageSquareMore} title="إعدادات المحادثات" web onPress={() => openSection("communication")} />
      </Panel>

      {signOutFailed ? <Notice tone="error">تعذر تسجيل الخروج. حاول مرة أخرى.</Notice> : null}
      {confirm ? (
        <View style={styles.confirm}>
          <AppText variant="bodyStrong">تأكيد تسجيل الخروج</AppText>
          <View style={styles.confirmRow}>
            <Button title="إلغاء" variant="secondary" onPress={() => setConfirm(false)} style={styles.flex} />
            <Button title="تأكيد الخروج" variant="destructive" loading={busy} onPress={() => void doSignOut()} style={styles.flex} />
          </View>
        </View>
      ) : (
        <Button title="تسجيل الخروج" variant="destructive" icon={LogOut} loading={busy} onPress={askSignOut} />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { flexDirection: "row", alignItems: "center", gap: SPACING.lg, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, padding: SPACING.lg },
  photo: { width: 64, height: 64, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  initial: { fontSize: 26, lineHeight: 36 },
  ok: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", backgroundColor: COLORS.successTint, borderRadius: 999, paddingHorizontal: SPACING.sm, marginTop: 2 },
  head: { flexDirection: "row", alignItems: "baseline", gap: SPACING.sm, flexWrap: "wrap" },
  info: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, paddingVertical: SPACING.md },
  border: { borderTopWidth: 1, borderTopColor: COLORS.border },
  label: { flexShrink: 0 },
  value: { flex: 1, textAlign: "left" },
  ltr: { writingDirection: "ltr" },
  confirm: { gap: SPACING.md, backgroundColor: COLORS.destructiveTint, borderRadius: 16, padding: SPACING.lg },
  confirmRow: { flexDirection: "row", gap: SPACING.md },
});
