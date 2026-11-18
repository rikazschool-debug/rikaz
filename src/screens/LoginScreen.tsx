import React, { useEffect, useRef, useState } from "react";
import { BackHandler, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Check, ChevronRight, ExternalLink, Lock, LogIn, MessageSquareText, Send } from "lucide-react-native";
import { RikazLogo } from "../components/RikazLogo";
import { AccountEntry, AccountEntrySelector, ENTRY_CONTENT } from "../components/AccountEntrySelector";
import { WelcomeScreen } from "./WelcomeScreen";
import { OtpCodeInput } from "../components/OtpCodeInput";
import { FadeIn } from "../components/FadeIn";
import { AppText, Button, LinkButton, Notice, TextField } from "../components/ui";
import { COLORS, LOGIN_COLORS, RADIUS, SPACING, TOUCH } from "../theme/tokens";
import { CONFIG } from "../config";
import { digitsOnly, isValidNationalId, RESEND_SECONDS } from "../lib/identity";
import { loginErrorMessage, requestIdCode, studentSignIn, verifyIdCode } from "../api/auth";

export const LoginScreen: React.FC = () => {
  const [entry, setEntry] = useState<AccountEntry | null>(null);

  // زر الرجوع في أندرويد يعيد إلى صفحة الترحيب بدل إغلاق التطبيق.
  useEffect(() => {
    if (!entry) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setEntry(null);
      return true;
    });
    return () => sub.remove();
  }, [entry]);

  if (!entry) return <WelcomeScreen onSelect={setEntry} />;
  return <SignInForm entry={entry} onChange={setEntry} onBack={() => setEntry(null)} />;
};

const SignInForm: React.FC<{ entry: AccountEntry; onChange: (e: AccountEntry) => void; onBack: () => void }> = ({ entry, onChange, onBack }) => {
  const insets = useSafeAreaInsets();
  const meta = ENTRY_CONTENT[entry];
  const showLoginForms = CONFIG.idLoginEnabled || CONFIG.loginDesignPreviewEnabled;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACING.lg, paddingBottom: insets.bottom + SPACING.xxl }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={styles.brand} accessible accessibilityRole="header" accessibilityLabel="ركاز">
            <RikazLogo size={34} />
            <View style={styles.brandText}>
              <AppText variant="title" weight="extrabold" color={LOGIN_COLORS.primary} style={styles.brandName}>ركاز</AppText>
              <AppText variant="micro" weight="bold" color={LOGIN_COLORS.primary} style={styles.brandLatin}>RIKAZ</AppText>
            </View>
          </View>
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="رجوع إلى صفحة الترحيب" hitSlop={TOUCH.hitSlop} style={({ pressed }) => [styles.back, pressed && styles.backPressed]}>
            <ChevronRight size={20} color={LOGIN_COLORS.foreground} />
          </Pressable>
        </View>

        <AccountEntrySelector value={entry} onChange={onChange} />

        <FadeIn key={entry} style={styles.gap}>
          <View style={styles.intro}>
            <View style={styles.eyebrow}>
              <AppText variant="label" weight="bold" color={LOGIN_COLORS.primary}>{meta.eyebrow}</AppText>
              <View style={styles.eyebrowLine} />
            </View>
            <AppText weight="extrabold" color={LOGIN_COLORS.foreground} style={styles.title}>{meta.title}</AppText>
            <AppText variant="caption" color={LOGIN_COLORS.mutedForeground}>{meta.description}</AppText>
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
          <View style={styles.secure}>
            <Lock size={13} color={LOGIN_COLORS.mutedForeground} />
            <AppText variant="micro" color={LOGIN_COLORS.mutedForeground}>بياناتك آمنة ومحمية</AppText>
          </View>
        </FadeIn>

        <View style={styles.help}>
          <AppText variant="micro" color={LOGIN_COLORS.mutedForeground} align="center">
            تحتاج مساعدة؟{" "}
            <AppText variant="micro" weight="bold" color={LOGIN_COLORS.primary}>تواصل مع إدارة مدرستك</AppText>
          </AppText>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

/** خطوات دخول ولي الأمر والكادر: رقم الهوية ثم رمز التحقق. */
const Steps: React.FC<{ step: 1 | 2 }> = ({ step }) => (
  <View style={styles.steps} accessible accessibilityRole="progressbar" accessibilityLabel={`الخطوة ${step} من 2`}>
    {(["بيانات الحساب", "التحقق"] as const).map((label, i) => {
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
        label="رقم الطالب — C‑Smart"
        hint="رقم الطالب المسجل لدى مدرستك"
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
        title="تسجيل الدخول"
        icon={LogIn}
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
          hint="سنرسل رمز التحقق عبر واتساب إلى جوالك المسجل."
          error={nid.length === 10 && !isValidNationalId(nid) ? "تحقق من رقم الهوية أو الإقامة" : null}
        />
        {msg ? <Notice tone="error">{msg}</Notice> : null}
        <Button
          title="إرسال رمز التحقق"
          icon={Send}
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
          <MessageSquareText size={26} color={LOGIN_COLORS.primary} />
        </View>
        <View style={styles.flex}>
          <AppText variant="title" weight="extrabold">التحقق من الرمز</AppText>
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
        title="تأكيد الرمز"
        icon={Check}
        onPress={() => void verify()}
        loading={busy === "verify"}
        disabled={!CONFIG.idLoginEnabled || code.length !== 6 || busy === "send"}
        colors={{ primary: LOGIN_COLORS.primaryContainer, primaryPressed: LOGIN_COLORS.primary, primaryForeground: LOGIN_COLORS.onPrimary }}
      />
      <View style={styles.otpActions}>
        <LinkButton title={left > 0 ? `إعادة الإرسال بعد ${left} ث` : "إعادة إرسال الرمز"} disabled={!CONFIG.idLoginEnabled || left > 0 || busy !== null} onPress={send} color={LOGIN_COLORS.secondary} />
        <LinkButton
          title="تعديل رقم الهوية"
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
  screen: { flex: 1, backgroundColor: LOGIN_COLORS.surface },
  content: { paddingHorizontal: SPACING.xl, gap: SPACING.xl, width: "100%", maxWidth: 560, alignSelf: "center", flexGrow: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: LOGIN_COLORS.border, alignItems: "center", justifyContent: "center", backgroundColor: LOGIN_COLORS.surface },
  backPressed: { backgroundColor: LOGIN_COLORS.surfaceLow },
  brand: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  brandText: { alignItems: "flex-start" },
  brandName: { lineHeight: 30 },
  brandLatin: { fontSize: 9, lineHeight: 11, letterSpacing: 1 },
  intro: { gap: SPACING.xs, alignItems: "flex-start" },
  eyebrow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  eyebrowLine: { width: 18, height: 3, borderRadius: 2, backgroundColor: COLORS.accent },
  title: { fontSize: 26, lineHeight: 40 },
  secure: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: SPACING.xs },
  help: { marginTop: "auto", paddingTop: SPACING.lg, borderTopWidth: 1, borderTopColor: LOGIN_COLORS.border },
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
