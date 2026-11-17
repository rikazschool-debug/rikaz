import React, { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { ExternalLink, MessageCircle, ShieldCheck } from "lucide-react-native";
import { RikazLogo } from "../components/RikazLogo";
import { AccountEntry, AccountEntrySelector, ENTRY_CONTENT } from "../components/AccountEntrySelector";
import { AppText, Button, Card, Divider, LinkButton, Notice, TextField } from "../components/ui";
import { LOGIN_COLORS, RADIUS, SPACING } from "../theme/tokens";
import { CONFIG } from "../config";
import { digitsOnly, isValidNationalId, RESEND_SECONDS } from "../lib/identity";
import { loginErrorMessage, requestIdCode, studentSignIn, verifyIdCode } from "../api/auth";

export const LoginScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [entry, setEntry] = useState<AccountEntry>("student");
  const meta = ENTRY_CONTENT[entry];
  const showLoginForms = CONFIG.idLoginEnabled || CONFIG.loginDesignPreviewEnabled;

  return (
    <KeyboardAvoidingView style={[styles.screen, { backgroundColor: LOGIN_COLORS.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ paddingBottom: insets.bottom + SPACING.xxxl }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[LOGIN_COLORS.background, LOGIN_COLORS.surfaceLow, LOGIN_COLORS.background]}
          style={styles.heroGradient}
        >
          <View style={[styles.hero, { paddingTop: insets.top + SPACING.xxl }]}>
            <View style={styles.logoTile}>
              <RikazLogo size={68} color={LOGIN_COLORS.primary} />
            </View>
            <AppText variant="headline" weight="extrabold" color={LOGIN_COLORS.primary} style={styles.brandName}>
              رِكَازْ
            </AppText>
            <AppText variant="caption" color={LOGIN_COLORS.secondary} style={styles.brandSubtitle}>
              منظومة الإدارة التعليمية الذكية
            </AppText>
            <AppText variant="title" color={LOGIN_COLORS.foreground} style={styles.heroTitle}>
              أهلاً بك في ركاز
            </AppText>
            <AppText variant="body" color={LOGIN_COLORS.mutedForeground} align="center" style={styles.heroDescription}>
              بوابتك اليومية للتعلّم والتواصل مع المدرسة
            </AppText>
          </View>
        </LinearGradient>

        <View style={styles.sheet}>
          <View style={styles.sectionIntro}>
            <AppText variant="headline" color={LOGIN_COLORS.foreground}>
              تسجيل الدخول
            </AppText>
            <AppText variant="caption" color={LOGIN_COLORS.mutedForeground}>
              اختر نوع الحساب للمتابعة
            </AppText>
          </View>
          <AccountEntrySelector value={entry} onChange={setEntry} />
          <Card raised style={[styles.formCard, { backgroundColor: LOGIN_COLORS.surface, borderColor: LOGIN_COLORS.border }]}>
            <View style={styles.descRow}>
              <View style={[styles.dot, { backgroundColor: LOGIN_COLORS.secondary }]} />
              <AppText variant="caption" color={LOGIN_COLORS.mutedForeground} style={styles.flex}>
                {meta.description}
              </AppText>
            </View>
            <Divider style={{ backgroundColor: LOGIN_COLORS.border }} />
            {!showLoginForms ? (
              <IdLoginUnavailable title={meta.title} />
            ) : (
              <>
                {CONFIG.loginDesignPreviewEnabled && !CONFIG.idLoginEnabled ? (
                  <Notice tone="warning" title="معاينة تصميم فقط">
                    أزرار الدخول وإرسال الرمز معطّلة حتى اكتمال اختبار حساب الطالب وولي الأمر على VPS.
                  </Notice>
                ) : null}
                {entry === "student" ? (
                  <StudentForm key="student" />
                ) : (
                  <CodeLogin key={entry} portal={entry} title={meta.title} />
                )}
              </>
            )}
          </Card>

          <View style={[styles.supportCard, { backgroundColor: LOGIN_COLORS.surfaceLow, borderColor: LOGIN_COLORS.border }]}>
            <View style={[styles.supportIcon, { backgroundColor: LOGIN_COLORS.surface, borderColor: LOGIN_COLORS.border }]}>
              <ShieldCheck size={19} color={LOGIN_COLORS.secondary} />
            </View>
            <View style={styles.flex}>
              <AppText variant="label" color={LOGIN_COLORS.foreground}>
                تحتاج مساعدة في الدخول؟
              </AppText>
              <AppText variant="caption" color={LOGIN_COLORS.mutedForeground}>
                لتحديث بياناتك، تواصل مع إدارة مدرستك.
              </AppText>
            </View>
          </View>
          <AppText variant="micro" color={LOGIN_COLORS.mutedForeground} align="center" style={styles.footer}>
            ركاز · مدارس تُدار بذكاء
          </AppText>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

/** يبقى المسار الحقيقي معطلًا حتى قبول اختبارات الدخول؛ لا يستبدل حارس الإعداد. */
const IdLoginUnavailable: React.FC<{ title: string }> = ({ title }) => (
  <View style={styles.gap}>
    <AppText variant="headline">{title}</AppText>
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
    if (!CONFIG.idLoginEnabled) return;
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
      <AppText variant="headline">الدخول إلى حساب الطالب</AppText>
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
        disabled={!CONFIG.idLoginEnabled || !isValidNationalId(nid) || !no.trim()}
        colors={{ primary: LOGIN_COLORS.primaryContainer, primaryPressed: LOGIN_COLORS.primary, primaryForeground: LOGIN_COLORS.onPrimary }}
      />
    </View>
  );
};

/** ولي الأمر والموظفون: رقم الهوية ثم رمز من 6 أرقام على واتساب */
const CodeLogin: React.FC<{ portal: "guardian" | "staff"; title: string }> = ({ portal, title }) => {
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
        <AppText variant="headline">{title}</AppText>
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
      <TextField
        ref={codeRef}
        label="رمز التحقق"
        value={code}
        onChangeText={(v) => {
          const c = digitsOnly(v, 6);
          setCode(c);
          if (c.length === 6 && busy === null && CONFIG.idLoginEnabled) void verify(c);
        }}
        keyboardType="number-pad"
        maxLength={6}
        ltr
        large
        colors={LOGIN_COLORS}
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === "android" ? "sms-otp" : "one-time-code"}
        placeholder="••••••"
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
  heroGradient: { width: "100%" },
  hero: {
    paddingHorizontal: SPACING.xxl,
    paddingBottom: SPACING.xxxl,
    alignItems: "center",
    gap: SPACING.xs + 2,
  },
  logoTile: {
    width: 88,
    height: 88,
    borderRadius: RADIUS.xl,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: LOGIN_COLORS.surface,
    borderWidth: 1,
    borderColor: LOGIN_COLORS.border,
    elevation: 3,
  },
  brandName: { marginTop: SPACING.xs },
  brandSubtitle: { marginTop: -SPACING.xs, letterSpacing: 0.1 },
  heroTitle: { marginTop: SPACING.lg, textAlign: "center" },
  heroDescription: { maxWidth: 320, marginTop: -SPACING.xs },
  sheet: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, gap: SPACING.lg, width: "100%", maxWidth: 560, alignSelf: "center" },
  sectionIntro: { gap: SPACING.xxs, paddingHorizontal: SPACING.xs },
  formCard: { gap: SPACING.lg, padding: SPACING.lg, borderRadius: RADIUS.xl },
  descRow: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.sm, paddingHorizontal: SPACING.xs },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 7 },
  gap: { gap: SPACING.lg },
  otpHead: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.md },
  otpIcon: { width: 48, height: 48, borderRadius: RADIUS.md, backgroundColor: LOGIN_COLORS.primaryTint, alignItems: "center", justifyContent: "center" },
  otpActions: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap" },
  ltrInline: { writingDirection: "ltr" },
  supportCard: { flexDirection: "row", alignItems: "center", gap: SPACING.md, padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1 },
  supportIcon: { width: 40, height: 40, borderRadius: RADIUS.sm, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  footer: { paddingTop: SPACING.sm, paddingBottom: SPACING.xs },
});
