import React, { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { BadgeCheck, Check, ExternalLink, Lock, MessageCircle, ShieldCheck, type LucideIcon } from "lucide-react-native";
import { RikazLogo } from "../components/RikazLogo";
import { AccountEntry, AccountEntrySelector, ENTRY_CONTENT, ENTRY_ICON } from "../components/AccountEntrySelector";
import { OtpCodeInput } from "../components/OtpCodeInput";
import { FadeIn } from "../components/FadeIn";
import { AppText, Button, Card, Divider, LinkButton, Notice, TextField } from "../components/ui";
import { COLORS, LOGIN_COLORS, RADIUS, SHADOWS, SPACING } from "../theme/tokens";
import { CONFIG } from "../config";
import { digitsOnly, isValidNationalId, RESEND_SECONDS } from "../lib/identity";
import { loginErrorMessage, requestIdCode, studentSignIn, verifyIdCode } from "../api/auth";

export const LoginScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [entry, setEntry] = useState<AccountEntry>("student");
  const meta = ENTRY_CONTENT[entry];
  const showLoginForms = CONFIG.idLoginEnabled || CONFIG.loginDesignPreviewEnabled;

  const EntryIcon = ENTRY_ICON[entry];

  return (
    <KeyboardAvoidingView style={[styles.screen, { backgroundColor: LOGIN_COLORS.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ paddingBottom: insets.bottom + SPACING.xxxl }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { paddingTop: insets.top + SPACING.xxl }]}>
          <View style={styles.heroRing} />
          <View style={styles.heroRingSmall} />
          <View style={styles.logoTile} accessible accessibilityRole="header" accessibilityLabel="ركاز، منظومة الإدارة التعليمية الذكية">
            <RikazLogo size={52} />
          </View>
          <AppText variant="display" color={LOGIN_COLORS.onPrimary} align="center">
            ركاز
          </AppText>
          <AppText variant="body" color={COLORS.onPrimaryMuted} align="center" style={styles.heroDescription}>
            منظومة الإدارة التعليمية الذكية
          </AppText>
        </View>

        <View style={styles.sheet}>
          <Card raised style={styles.formCard}>
            <View style={styles.sectionIntro}>
              <AppText variant="title" color={LOGIN_COLORS.foreground}>
                أهلاً بك
              </AppText>
              <AppText variant="caption" color={LOGIN_COLORS.mutedForeground}>
                اختر نوع حسابك لتسجيل الدخول
              </AppText>
            </View>
            <AccountEntrySelector value={entry} onChange={setEntry} />
            <Divider style={{ backgroundColor: LOGIN_COLORS.border }} />
            <FadeIn key={entry} style={styles.gap}>
            <View style={styles.formHead}>
              <View style={styles.formHeadIcon}>
                <EntryIcon size={22} color={LOGIN_COLORS.primary} />
              </View>
              <View style={styles.flex}>
                <AppText variant="headline">{meta.title}</AppText>
                <AppText variant="caption" color={LOGIN_COLORS.mutedForeground}>
                  {meta.description}
                </AppText>
              </View>
            </View>
            {!showLoginForms ? (
              <IdLoginUnavailable />
            ) : (
              <>
                {CONFIG.loginDesignPreviewEnabled && !CONFIG.idLoginEnabled ? (
                  <Notice tone="warning" title="معاينة تصميم فقط">
                    أزرار الدخول وإرسال الرمز معطّلة حتى اكتمال اختبار الدخول.
                  </Notice>
                ) : null}
                {entry === "student" ? (
                  CONFIG.studentLoginEnabled ? (
                    <StudentForm key="student" />
                  ) : (
                    <Notice tone="warning" title="دخول الطالب متوقف مؤقتًا">
                      يمكنك الدخول من منصة ركاز على الويب إلى حين تفعيله في التطبيق.
                    </Notice>
                  )
                ) : (
                  <CodeLogin key={entry} portal={entry} />
                )}
              </>
            )}
            </FadeIn>
          </Card>

          <View style={styles.trustRow}>
            <TrustItem icon={Lock} label="اتصال مشفّر" />
            <TrustItem icon={ShieldCheck} label="رمز لمرة واحدة" />
            <TrustItem icon={BadgeCheck} label="حسابات المدرسة فقط" />
          </View>
          <AppText variant="caption" color={LOGIN_COLORS.mutedForeground} align="center">
            تواجه صعوبة في الدخول؟ تواصل مع إدارة مدرستك.
          </AppText>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const TrustItem: React.FC<{ icon: LucideIcon; label: string }> = ({ icon: Icon, label }) => (
  <View style={styles.trustItem}>
    <Icon size={16} color={LOGIN_COLORS.primary} />
    <AppText variant="micro" color={LOGIN_COLORS.mutedForeground} align="center">
      {label}
    </AppText>
  </View>
);

/** خطوات دخول ولي الأمر والكادر: رقم الهوية ثم رمز التحقق. */
const Steps: React.FC<{ step: 1 | 2 }> = ({ step }) => (
  <View style={[styles.steps, styles.stepsRtl]} accessible accessibilityRole="progressbar" accessibilityLabel={`الخطوة ${step} من 2`}>
    {(["رقم الهوية", "رمز التحقق"] as const).map((label, i) => {
      const n = i + 1;
      const done = n < step;
      const on = n === step;
      return (
        <React.Fragment key={label}>
          {i > 0 ? <View style={[styles.stepLine, step > 1 && styles.stepLineOn]} /> : null}
          <View style={styles.step}>
            <View style={[styles.stepDot, (on || done) && styles.stepDotOn]}>
              {done ? (
                <Check size={14} color={LOGIN_COLORS.onPrimary} strokeWidth={3} />
              ) : (
                <AppText variant="micro" weight="bold" color={on ? LOGIN_COLORS.onPrimary : LOGIN_COLORS.mutedForeground}>
                  {n}
                </AppText>
              )}
            </View>
            <AppText variant="micro" color={on ? LOGIN_COLORS.foreground : LOGIN_COLORS.mutedForeground}>
              {label}
            </AppText>
          </View>
        </React.Fragment>
      );
    })}
  </View>
);

/** يبقى المسار الحقيقي معطلًا حتى قبول اختبارات الدخول؛ لا يستبدل حارس الإعداد. */
const IdLoginUnavailable: React.FC = () => (
  <View style={styles.gap}>
    <Notice tone="warning" title="الدخول من التطبيق متوقف مؤقتًا">
      خدمات الدخول منشورة، ويظل التطبيق مغلقًا حتى قبول اختبار الطالب وولي الأمر. يمكنك الدخول من منصة ركاز على الويب.
    </Notice>
    <Button title="فتح منصة ركاز" variant="secondary" icon={ExternalLink} onPress={() => void Linking.openURL(`${CONFIG.platformUrl}/auth`)} />
  </View>
);

const StudentForm: React.FC = () => {
  const [nid, setNid] = useState("");
  const [no, setNo] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const noRef = useRef<TextInput>(null);

  async function go() {
    if (!CONFIG.studentLoginEnabled) return;
    setBusy(true);
    setMsg(null);
    try {
      await studentSignIn(nid, no);
    } catch (e) {
      setMsg(loginErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.gap}>
      <TextField
        label="رقم الهوية أو الإقامة"
        value={nid}
        onChangeText={(v) => setNid(digitsOnly(v))}
        keyboardType="number-pad"
        maxLength={10}
        ltr
        colors={LOGIN_COLORS}
        autoComplete="off"
        returnKeyType="next"
        onSubmitEditing={() => noRef.current?.focus()}
        placeholder="1xxxxxxxxx"
        error={nid.length === 10 && !isValidNationalId(nid) ? "تحقق من رقم الهوية أو الإقامة" : null}
      />
      <TextField
        ref={noRef}
        label="رقم الطالب الداخلي — C‑Smart"
        value={no}
        onChangeText={(value) => setNo(value.slice(0, 40))}
        maxLength={40}
        ltr
        colors={LOGIN_COLORS}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="go"
        onSubmitEditing={() => isValidNationalId(nid) && no.trim() && void go()}
      />
      {msg ? <Notice tone="error">{msg}</Notice> : null}
      <Button
        title="دخول"
        onPress={go}
        loading={busy}
        disabled={!CONFIG.studentLoginEnabled || !isValidNationalId(nid) || !no.trim()}
        colors={{ primary: LOGIN_COLORS.primaryContainer, primaryPressed: LOGIN_COLORS.primary, primaryForeground: LOGIN_COLORS.onPrimary }}
      />
    </View>
  );
};

/** ولي الأمر والموظفون: رقم الهوية ثم رمز من 6 أرقام على واتساب */
const CodeLogin: React.FC<{ portal: "guardian" | "staff" }> = ({ portal }) => {
  const [nid, setNid] = useState("");
  const [code, setCode] = useState("");
  const [ch, setCh] = useState<{ id: string; masked: string } | null>(null);
  const [busy, setBusy] = useState<"send" | "verify" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [left, setLeft] = useState(0);
  const codeRef = useRef<TextInput>(null);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  async function send() {
    if (!CONFIG.idLoginEnabled) return;
    setBusy("send");
    setMsg(null);
    try {
      const r = await requestIdCode(nid, portal);
      setCh({ id: r.challenge, masked: r.masked });
      setCode("");
      setLeft(RESEND_SECONDS);
      setTimeout(() => codeRef.current?.focus(), 250);
    } catch (e) {
      setMsg(loginErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function verify(value = code) {
    if (!ch || !CONFIG.idLoginEnabled) return;
    setBusy("verify");
    setMsg(null);
    try {
      await verifyIdCode(ch.id, value, portal);
    } catch (e) {
      setMsg(loginErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  if (!ch) {
    return (
      <View style={styles.gap}>
        <Steps step={1} />
        <TextField
          label="رقم الهوية أو الإقامة"
          value={nid}
          onChangeText={(v) => setNid(digitsOnly(v))}
          keyboardType="number-pad"
          maxLength={10}
          ltr
          colors={LOGIN_COLORS}
          autoComplete="off"
          returnKeyType="send"
          onSubmitEditing={() => isValidNationalId(nid) && void send()}
          placeholder="1xxxxxxxxx"
          hint="سيصلك رمز على واتساب في الجوال المسجل لدى المدرسة."
          error={nid.length === 10 && !isValidNationalId(nid) ? "تحقق من رقم الهوية أو الإقامة" : null}
        />
        {msg ? <Notice tone="error">{msg}</Notice> : null}
        <Button
          title="إرسال الرمز"
          icon={MessageCircle}
          onPress={send}
          loading={busy === "send"}
          disabled={!CONFIG.idLoginEnabled || !isValidNationalId(nid)}
          colors={{ primary: LOGIN_COLORS.primaryContainer, primaryPressed: LOGIN_COLORS.primary, primaryForeground: LOGIN_COLORS.onPrimary }}
        />
      </View>
    );
  }

  return (
    <View style={styles.gap}>
      <Steps step={2} />
      <View style={styles.otpHead}>
        <View style={styles.otpIcon}>
          <ShieldCheck size={26} color={LOGIN_COLORS.primary} />
        </View>
        <View style={styles.flex}>
          <AppText variant="headline">أدخل رمز التحقق</AppText>
          <AppText variant="caption" color={LOGIN_COLORS.mutedForeground}>
            أرسلنا رمزًا من 6 أرقام على واتساب إلى الجوال المنتهي بـ{" "}
            <AppText variant="caption" weight="bold" color={LOGIN_COLORS.foreground} style={styles.ltrInline}>
              {ch.masked.replace(/•/g, "")}
            </AppText>
          </AppText>
        </View>
      </View>
      <OtpCodeInput
        ref={codeRef}
        value={code}
        onChangeText={(v) => {
          const c = digitsOnly(v, 6);
          setCode(c);
          if (c.length === 6 && busy === null && CONFIG.idLoginEnabled) void verify(c);
        }}
      />
      {msg ? <Notice tone="error">{msg}</Notice> : null}
      <Button
        title="تأكيد الدخول"
        onPress={() => void verify()}
        loading={busy === "verify"}
        disabled={!CONFIG.idLoginEnabled || code.length !== 6 || busy === "send"}
        colors={{ primary: LOGIN_COLORS.primaryContainer, primaryPressed: LOGIN_COLORS.primary, primaryForeground: LOGIN_COLORS.onPrimary }}
      />
      <View style={styles.otpActions}>
        <LinkButton title={left > 0 ? `إعادة الإرسال بعد ${left} ث` : "إعادة إرسال الرمز"} disabled={!CONFIG.idLoginEnabled || left > 0 || busy !== null} onPress={send} color={LOGIN_COLORS.secondary} />
        <LinkButton
          title="تغيير رقم الهوية"
          color={LOGIN_COLORS.secondary}
          disabled={busy !== null}
          onPress={() => {
            setCh(null);
            setCode("");
            setMsg(null);
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: LOGIN_COLORS.background },
  hero: {
    backgroundColor: LOGIN_COLORS.primary,
    paddingHorizontal: SPACING.xxl,
    paddingBottom: SPACING.huge + SPACING.xxxl,
    alignItems: "center",
    gap: SPACING.xs,
    borderBottomLeftRadius: RADIUS.xl + SPACING.lg,
    borderBottomRightRadius: RADIUS.xl + SPACING.lg,
    overflow: "hidden",
  },
  heroRing: { position: "absolute", top: -60, left: -70, width: 220, height: 220, borderRadius: 110, borderWidth: 28, borderColor: COLORS.onPrimarySubtle },
  heroRingSmall: { position: "absolute", bottom: -30, right: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: COLORS.onPrimarySubtle },
  heroDescription: { maxWidth: 320 },
  logoTile: { width: 84, height: 84, borderRadius: RADIUS.xl, backgroundColor: LOGIN_COLORS.surface, alignItems: "center", justifyContent: "center", marginBottom: SPACING.sm, ...SHADOWS.raised },
  sheet: { paddingHorizontal: SPACING.lg, marginTop: -SPACING.huge - SPACING.md, gap: SPACING.lg, width: "100%", maxWidth: 560, alignSelf: "center" },
  sectionIntro: { gap: SPACING.xxs },
  formCard: { gap: SPACING.lg, padding: SPACING.xl, borderRadius: RADIUS.xl },
  formHead: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.md },
  formHeadIcon: { width: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: LOGIN_COLORS.primaryTint, alignItems: "center", justifyContent: "center" },
  trustRow: { flexDirection: "row", justifyContent: "space-between", gap: SPACING.sm, paddingHorizontal: SPACING.sm },
  trustItem: { flex: 1, alignItems: "center", gap: SPACING.xs },
  stepsRtl: { flexDirection: "row-reverse" },
  steps: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: SPACING.md },
  step: { alignItems: "center", gap: SPACING.xs },
  stepDot: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: LOGIN_COLORS.surfaceLow, borderWidth: 1, borderColor: LOGIN_COLORS.border },
  stepDotOn: { backgroundColor: LOGIN_COLORS.primary, borderColor: LOGIN_COLORS.primary },
  stepLine: { flex: 1, height: 2, marginTop: 13, marginHorizontal: SPACING.sm, backgroundColor: LOGIN_COLORS.border },
  stepLineOn: { backgroundColor: LOGIN_COLORS.primary },
  gap: { gap: SPACING.lg },
  otpHead: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.md },
  otpIcon: { width: 48, height: 48, borderRadius: RADIUS.md, backgroundColor: LOGIN_COLORS.primaryTint, alignItems: "center", justifyContent: "center" },
  otpActions: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap" },
  ltrInline: { writingDirection: "ltr" },
});
