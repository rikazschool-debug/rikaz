import React, { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ExternalLink, MessageCircle, ShieldCheck } from "lucide-react-native";
import { Brand } from "../components/Brand";
import { AccountEntry, AccountEntrySelector, ENTRY_CONTENT } from "../components/AccountEntrySelector";
import { AppText, Button, Card, Divider, LinkButton, Notice, TextField } from "../components/ui";
import { COLORS, RADIUS, SPACING } from "../theme/tokens";
import { CONFIG } from "../config";
import { digitsOnly, RESEND_SECONDS } from "../lib/identity";
import { loginErrorMessage, requestIdCode, studentSignIn, verifyIdCode } from "../api/auth";

export const LoginScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [entry, setEntry] = useState<AccountEntry>("student");
  const meta = ENTRY_CONTENT[entry];

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ paddingBottom: insets.bottom + SPACING.xxxl }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View style={[styles.hero, { paddingTop: insets.top + SPACING.xxl }]}>
          <Brand size={64} />
          <AppText variant="title" color={COLORS.primary} style={styles.heroTitle}>
            منظومة الإدارة التعليمية الذكية
          </AppText>
        </View>

        <View style={styles.sheet}>
          <AccountEntrySelector value={entry} onChange={setEntry} />
          <Card raised style={styles.formCard}>
            <View style={styles.descRow}>
              <View style={styles.dot} />
              <AppText variant="caption" color={COLORS.mutedForeground} style={styles.flex}>
                {meta.description}
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: COLORS.background },
  hero: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.xxl,
    paddingBottom: SPACING.xxl,
    alignItems: "center",
    gap: SPACING.xs,
  },
  heroTitle: { marginTop: SPACING.lg, textAlign: "center" },
  sheet: { paddingHorizontal: SPACING.lg, gap: SPACING.lg, width: "100%", maxWidth: 560, alignSelf: "center" },
  formCard: { gap: SPACING.lg, padding: SPACING.lg },
  descRow: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.sm, paddingHorizontal: SPACING.xs },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent, marginTop: 7 },
  gap: { gap: SPACING.lg },
  otpHead: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.md },
  otpIcon: { width: 48, height: 48, borderRadius: RADIUS.md, backgroundColor: COLORS.primaryTint, alignItems: "center", justifyContent: "center" },
  otpActions: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap" },
  ltrInline: { writingDirection: "ltr" },
});
