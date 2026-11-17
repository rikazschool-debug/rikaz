import React, { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Building2, ExternalLink, GraduationCap, HeartHandshake, KeyRound, MessageCircle, ShieldCheck } from "lucide-react-native";
import { Brand } from "../components/Brand";
import { AppText, Button, Card, Divider, LinkButton, Notice, Segmented, SegmentOption, TextField } from "../components/ui";
import { COLORS, RADIUS, SPACING } from "../theme/tokens";
import { CONFIG } from "../config";
import { digitsOnly, RESEND_SECONDS } from "../lib/identity";
import { loginErrorMessage, platformOwnerSignIn, requestIdCode, studentSignIn, verifyIdCode } from "../api/auth";

type Entry = "student" | "guardian" | "staff";

const ENTRIES: (SegmentOption<Entry> & { title: string; desc: string })[] = [
  { key: "student", label: "الطالب", icon: GraduationCap, title: "الدخول إلى حساب الطالب", desc: "برقم الهوية أو الإقامة ورقم الطالب في C‑Smart" },
  { key: "guardian", label: "ولي الأمر", icon: HeartHandshake, title: "الدخول إلى حساب ولي الأمر", desc: "برقم الهوية أو الإقامة ورمز يصل إلى جوالك المسجل في المدرسة" },
  { key: "staff", label: "الإدارة والموظفون", icon: Building2, title: "الدخول إلى حساب الإدارة والموظفين", desc: "برقم الهوية أو الإقامة ورمز يصل إلى جوالك المسجل" },
];

export const LoginScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [entry, setEntry] = useState<Entry>("student");
  const [ownerOpen, setOwnerOpen] = useState(false);
  const meta = ENTRIES.find((e) => e.key === entry)!;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ paddingBottom: insets.bottom + SPACING.xxxl }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View style={[styles.hero, { paddingTop: insets.top + SPACING.xxl }]}>
          <Brand light size={44} />
          <AppText variant="display" color={COLORS.primaryForeground} style={styles.heroTitle}>
            مرحبًا بك في ركاز
          </AppText>
          <AppText variant="body" color={COLORS.onPrimaryMuted}>
            اختر نوع حسابك للمتابعة
          </AppText>
        </View>

        <View style={styles.sheet}>
          <Card raised style={styles.formCard}>
            <Segmented label="نوع الحساب" options={ENTRIES} value={entry} onChange={setEntry} />
            <View style={styles.descRow}>
              <View style={styles.dot} />
              <AppText variant="caption" color={COLORS.mutedForeground} style={styles.flex}>
                {meta.desc}
              </AppText>
            </View>
            <Divider />
            {!CONFIG.idLoginEnabled ? (
              <IdLoginUnavailable title={meta.title} />
            ) : entry === "student" ? (
              <StudentForm key="student" />
            ) : (
              <CodeLogin key={entry} portal={entry} title={meta.title} />
            )}
          </Card>

          <View style={styles.ownerBox}>
            {ownerOpen ? (
              <PlatformOwnerForm onClose={() => setOwnerOpen(false)} />
            ) : (
              <LinkButton title="دخول مالك المنصة" color={COLORS.mutedForeground} onPress={() => setOwnerOpen(true)} />
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

/** يظهر حتى تُتاح خدمة الدخول بالهوية للتطبيق؛ لا يُعرض نموذج لا يعمل */
const IdLoginUnavailable: React.FC<{ title: string }> = ({ title }) => (
  <View style={styles.gap}>
    <AppText variant="headline">{title}</AppText>
    <Notice tone="warning" title="غير متاح في التطبيق بعد">
      الدخول برقم الهوية من تطبيق الجوال قيد الربط مع منصة ركاز. يمكنك الدخول الآن من منصة ركاز على الويب بالطريقة نفسها.
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
        autoComplete="off"
        returnKeyType="next"
        onSubmitEditing={() => noRef.current?.focus()}
        placeholder="1xxxxxxxxx"
      />
      <TextField
        ref={noRef}
        label="رقم الطالب الداخلي — C‑Smart"
        value={no}
        onChangeText={setNo}
        ltr
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="go"
        onSubmitEditing={() => nid && no && void go()}
      />
      {msg ? <Notice tone="error">{msg}</Notice> : null}
      <Button title="دخول" onPress={go} loading={busy} disabled={!nid || !no.trim()} />
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
    if (!ch) return;
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
          autoComplete="off"
          returnKeyType="send"
          onSubmitEditing={() => nid.length === 10 && void send()}
          placeholder="1xxxxxxxxx"
          hint="سيصلك رمز على واتساب في الجوال المسجل لدى المدرسة."
        />
        {msg ? <Notice tone="error">{msg}</Notice> : null}
        <Button title="إرسال الرمز" icon={MessageCircle} onPress={send} loading={busy === "send"} disabled={nid.length !== 10} />
      </View>
    );
  }

  return (
    <View style={styles.gap}>
      <View style={styles.otpHead}>
        <View style={styles.otpIcon}>
          <ShieldCheck size={26} color={COLORS.primary} />
        </View>
        <View style={styles.flex}>
          <AppText variant="headline">أدخل رمز التحقق</AppText>
          <AppText variant="caption" color={COLORS.mutedForeground}>
            أرسلنا رمزًا من 6 أرقام على واتساب إلى الجوال المنتهي بـ{" "}
            <AppText variant="caption" weight="bold" color={COLORS.foreground} style={styles.ltrInline}>
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
          if (c.length === 6 && busy === null) void verify(c);
        }}
        keyboardType="number-pad"
        maxLength={6}
        ltr
        large
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === "android" ? "sms-otp" : "one-time-code"}
        placeholder="••••••"
      />
      {msg ? <Notice tone="error">{msg}</Notice> : null}
      <Button title="تأكيد الدخول" onPress={() => void verify()} loading={busy === "verify"} disabled={code.length !== 6 || busy === "send"} />
      <View style={styles.otpActions}>
        <LinkButton title={left > 0 ? `إعادة الإرسال بعد ${left} ث` : "إعادة إرسال الرمز"} disabled={left > 0 || busy !== null} onPress={send} />
        <LinkButton
          title="تغيير رقم الهوية"
          color={COLORS.mutedForeground}
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

const PlatformOwnerForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const pwRef = useRef<TextInput>(null);

  async function login() {
    setBusy(true);
    setMsg(null);
    try {
      await platformOwnerSignIn(email, pw);
    } catch (e) {
      setMsg(loginErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={styles.gap}>
      <View style={styles.ownerHead}>
        <KeyRound size={20} color={COLORS.primary} />
        <AppText variant="bodyStrong" style={styles.flex}>
          دخول مالك المنصة
        </AppText>
      </View>
      <TextField
        label="البريد الإلكتروني"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="username"
        ltr
        returnKeyType="next"
        onSubmitEditing={() => pwRef.current?.focus()}
      />
      <TextField
        ref={pwRef}
        label="كلمة المرور"
        value={pw}
        onChangeText={setPw}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password"
        textContentType="password"
        ltr
        returnKeyType="go"
        onSubmitEditing={() => void login()}
      />
      {msg ? <Notice tone="error">{msg}</Notice> : null}
      <Button title="دخول" onPress={login} loading={busy} disabled={!email || pw.length < 8} />
      <LinkButton title="إلغاء" color={COLORS.mutedForeground} onPress={onClose} />
    </Card>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: COLORS.background },
  hero: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xxl,
    paddingBottom: SPACING.huge + SPACING.xxl,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
    gap: SPACING.xs,
  },
  heroTitle: { marginTop: SPACING.xxl },
  sheet: { paddingHorizontal: SPACING.lg, marginTop: -SPACING.huge, gap: SPACING.lg },
  formCard: { gap: SPACING.lg, padding: SPACING.lg },
  descRow: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.sm, paddingHorizontal: SPACING.xs },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent, marginTop: 7 },
  gap: { gap: SPACING.lg },
  otpHead: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.md },
  otpIcon: { width: 48, height: 48, borderRadius: RADIUS.md, backgroundColor: COLORS.primaryTint, alignItems: "center", justifyContent: "center" },
  otpActions: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap" },
  ltrInline: { writingDirection: "ltr" },
  ownerBox: { alignItems: "stretch" },
  ownerHead: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
});
