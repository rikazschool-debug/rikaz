import React, { useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from "react-native";
import { BadgeCheck, ChevronLeft, CircleCheck, ExternalLink, GraduationCap, IdCard, Lock, LogOut, Mail, MessageSquareMore, Repeat, Smartphone, UserRound, type LucideIcon } from "lucide-react-native";
import { AppText, Button, Notice } from "../../components/ui";
import { openSection, WEB_HINT } from "../../components/StudentKit";
import { SBadge, SScreen, SSection } from "../../components/student/SKit";
import { useAuth } from "../../hooks/useAuth";
import { maskNationalId, maskPhone } from "../../lib/mask";
import { displayableEmail } from "../../lib/identity";
import { useStudentProfile } from "./useStudentProfile";
import { R, S, SHADOW } from "../../theme/student";
import { SPACING } from "../../theme/tokens";

const InfoRow: React.FC<{ icon: LucideIcon; label: string; value: string | null | undefined; ltr?: boolean; end?: React.ReactNode }> = ({ icon: Icon, label, value, ltr, end }) => (
  <View style={styles.info} accessible accessibilityLabel={`${label}: ${value || "غير مسجل"}`}>
    <View style={styles.infoWell}><Icon size={20} color={S.primary} /></View>
    <View style={styles.flex}>
      <AppText variant="caption" color={S.text2}>{label}</AppText>
      <AppText variant="bodyStrong" weight="semibold" color={value ? S.ink : S.muted} style={ltr && value ? styles.ltr : undefined} numberOfLines={2}>
        {value || "غير مسجل"}
      </AppText>
    </View>
    {end}
  </View>
);

const ActionRow: React.FC<{ icon: LucideIcon; title: string; subtitle?: string; onPress: () => void; web?: boolean; tone?: "mint" | "blue" }> = ({ icon: Icon, title, subtitle, onPress, web, tone = "mint" }) => (
  <Pressable onPress={onPress} accessibilityRole={web ? "link" : "button"} accessibilityLabel={subtitle ? `${title}، ${subtitle}` : title} accessibilityHint={web ? WEB_HINT : undefined}
    style={({ pressed }) => [styles.action, pressed && { backgroundColor: S.mint }]}>
    <View style={[styles.actionWell, tone === "blue" && { backgroundColor: S.blueWash }]}><Icon size={22} color={tone === "blue" ? "#1E3A8A" : S.primary} /></View>
    <View style={styles.flex}>
      <AppText variant="bodyStrong" weight="bold" color={S.ink}>{title}</AppText>
      {subtitle ? <AppText variant="caption" color={S.text2} numberOfLines={2}>{subtitle}</AppText> : null}
    </View>
    {web ? <ExternalLink size={18} color={S.muted} /> : <ChevronLeft size={20} color={S.muted} />}
  </Pressable>
);

/** حسابي للطالب: الحقول نفسها في الملف الشخصي بالمنصة (قراءة فقط). */
export const StudentAccount: React.FC<{ onSwitch: () => void }> = ({ onSwitch }) => {
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
    <SScreen>
      <View style={styles.hero}>
        <View style={styles.heroGlow} />
        <View style={styles.photo}>
          <AppText weight="bold" color={S.onPrimary} style={styles.initial}>{name?.trim().charAt(0) || "ر"}</AppText>
        </View>
        <AppText variant="title" weight="bold" color={S.ink} align="center" numberOfLines={2}>{name || "طالب ركاز"}</AppText>
        <AppText variant="caption" color={S.text2} align="center" numberOfLines={2}>{profile?.section ? `طالب • ${profile.section}` : "طالب"}</AppText>
        <View style={styles.chips}>
          <SBadge label="حساب موثّق" tone="mint" icon={BadgeCheck} />
          {active?.schoolName ? <SBadge label={active.schoolName} tone="muted" icon={GraduationCap} /> : null}
        </View>
      </View>

      <SSection title="الملف الشخصي" end={<AppText variant="micro" color={S.text2}>بياناتك كما سجّلتها المدرسة</AppText>} />
      {failed ? <Notice tone="warning">تعذر تحميل بعض بياناتك الآن. حاول لاحقًا.</Notice> : null}
      <View style={styles.panel}>
        <InfoRow icon={UserRound} label="الاسم الكامل" value={name} />
        <InfoRow icon={CircleCheck} label="الحساب" value={active?.schoolName ? `طالب — ${active.schoolName}` : "طالب"} />
        <InfoRow icon={IdCard} label="رقم الهوية الوطنية" value={maskNationalId(profile?.national_id)} ltr end={<Lock size={16} color={S.muted} />} />
        <InfoRow icon={Smartphone} label="الجوال" value={maskPhone(profile?.phone)} ltr />
        <InfoRow icon={Mail} label="البريد الإلكتروني" value={email} ltr />
        <InfoRow icon={GraduationCap} label="المرحلة / الصف / الشعبة" value={profile?.section} />
      </View>
      <AppText variant="micro" color={S.text2}>لتصحيح أي بيان تواصل مع إدارة المدرسة.</AppText>

      <SSection title="الحساب والصفة" />
      <View style={styles.actions}>
        {contexts.length > 1 ? <ActionRow icon={Repeat} title="تبديل الصفة" subtitle={active?.schoolName ? `طالب • ${active.schoolName}` : undefined} onPress={onSwitch} /> : null}
        <ActionRow icon={MessageSquareMore} tone="blue" title="إعدادات المحادثات" subtitle="الخصوصية والتنبيهات" web onPress={() => openSection("communication")} />
      </View>

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
        <Pressable onPress={askSignOut} disabled={busy} accessibilityRole="button" accessibilityLabel="تسجيل الخروج" style={({ pressed }) => [styles.logout, pressed && { opacity: 0.85 }]}>
          {busy ? <ActivityIndicator color={S.danger} /> : <LogOut size={20} color={S.danger} />}
          <AppText variant="bodyStrong" weight="bold" color={S.danger}>تسجيل الخروج</AppText>
        </Pressable>
      )}
    </SScreen>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  ltr: { writingDirection: "ltr", textAlign: "right" },
  hero: { alignItems: "center", gap: SPACING.xs, backgroundColor: S.surface, borderRadius: R.card + 8, padding: SPACING.xl, overflow: "hidden", borderWidth: 1, borderColor: S.hairline, ...SHADOW.l1 },
  heroGlow: { position: "absolute", bottom: -120, end: -60, width: 260, height: 260, borderRadius: 130, backgroundColor: S.mint },
  photo: { width: 112, height: 112, borderRadius: 28, backgroundColor: S.primary, alignItems: "center", justifyContent: "center", marginBottom: SPACING.sm, ...SHADOW.l2 },
  initial: { fontSize: 52, lineHeight: 70 },
  chips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: SPACING.sm, marginTop: SPACING.sm },
  panel: { backgroundColor: S.surface, borderRadius: R.card + 8, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderWidth: 1, borderColor: S.hairline, ...SHADOW.l1 },
  info: { flexDirection: "row", alignItems: "center", gap: SPACING.md, paddingVertical: SPACING.md },
  infoWell: { width: 48, height: 48, borderRadius: 24, backgroundColor: S.mint, alignItems: "center", justifyContent: "center" },
  actions: { gap: SPACING.md },
  action: { flexDirection: "row", alignItems: "center", gap: SPACING.md, backgroundColor: S.surface, borderRadius: R.card + 8, padding: SPACING.lg, minHeight: 80, borderWidth: 1, borderColor: S.hairline, ...SHADOW.l1 },
  actionWell: { width: 56, height: 56, borderRadius: 28, backgroundColor: S.mint, alignItems: "center", justifyContent: "center" },
  logout: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: SPACING.sm, minHeight: 64, borderRadius: R.chip, backgroundColor: S.dangerWash, borderWidth: 1, borderColor: S.dangerBorder },
  confirm: { gap: SPACING.md, backgroundColor: S.dangerWash, borderRadius: 16, padding: SPACING.lg },
  confirmRow: { flexDirection: "row", gap: SPACING.md },
});
