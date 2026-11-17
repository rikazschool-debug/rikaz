import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { BrandHeader } from "../components/BrandHeader";
import { Button, Input, AlertBanner, COLORS } from "../components/UiComponents";
import { Portal } from "../api/types";
import { studentSignIn, requestIdCode, verifyIdCode, passwordSignIn } from "../api/auth";

export const LoginScreen: React.FC = () => {
  const [portal, setPortal] = useState<Portal>("student");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Student inputs
  const [studentNid, setStudentNid] = useState("");
  const [studentCsmart, setStudentCsmart] = useState("");

  // OTP inputs (Guardian & Staff)
  const [nid, setNid] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<{ id: string; masked: string } | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Staff Password inputs
  const [staffAuthMode, setStaffAuthMode] = useState<"otp" | "password">("otp");
  const [staffIdentifier, setStaffIdentifier] = useState("");
  const [staffPassword, setStaffPassword] = useState("");

  // Timer countdown for OTP resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const resetFormState = () => {
    setErrorMsg(null);
    setChallenge(null);
    setCode("");
    setCountdown(0);
  };

  // 1. Student Submit
  async function handleStudentSubmit() {
    Keyboard.dismiss();
    setErrorMsg(null);
    if (!studentNid || !studentCsmart) {
      setErrorMsg("يرجى إدخال رقم الهوية ورقم C-Smart");
      return;
    }
    setLoading(true);
    try {
      await studentSignIn(studentNid, studentCsmart);
    } catch (err: any) {
      setErrorMsg(err.message || "فشل تسجيل الدخول كطالب");
    } finally {
      setLoading(false);
    }
  }

  // 2. Request OTP Code
  async function handleRequestCode() {
    Keyboard.dismiss();
    setErrorMsg(null);
    if (!nid || nid.length !== 10) {
      setErrorMsg("يرجى إدخال رقم هوية أو إقامة صحيح من 10 أرقام");
      return;
    }
    setLoading(true);
    try {
      const res = await requestIdCode(nid, portal === "guardian" ? "guardian" : "staff");
      setChallenge({ id: res.challenge, masked: res.masked });
      setCountdown(60); // 60s cooldown according to server rules
    } catch (err: any) {
      setErrorMsg(err.message || "تعذر إرسال رمز التحقق");
    } finally {
      setLoading(false);
    }
  }

  // 3. Verify OTP Code
  async function handleVerifyCode() {
    Keyboard.dismiss();
    setErrorMsg(null);
    if (!challenge || code.length !== 6) {
      setErrorMsg("يرجى إدخال رمز التحقق المكون من 6 أرقام");
      return;
    }
    setLoading(true);
    try {
      await verifyIdCode(challenge.id, code, portal === "guardian" ? "guardian" : "staff");
    } catch (err: any) {
      setErrorMsg(err.message || "الرمز غير صحيح أو منتهي الصلاحية");
    } finally {
      setLoading(false);
    }
  }

  // 4. Staff Password Submit
  async function handlePasswordSubmit() {
    Keyboard.dismiss();
    setErrorMsg(null);
    if (!staffIdentifier || !staffPassword) {
      setErrorMsg("يرجى إدخال اسم المستخدم وكلمة المرور");
      return;
    }
    setLoading(true);
    try {
      await passwordSignIn(staffIdentifier, staffPassword);
    } catch (err: any) {
      setErrorMsg(err.message || "بيانات الدخول غير صحيحة");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <BrandHeader />

            {/* Portal Tab Selector */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, portal === "student" && styles.tabActive]}
                onPress={() => { setPortal("student"); resetFormState(); }}
              >
                <Text style={[styles.tabText, portal === "student" && styles.tabTextActive]}>
                  الطالب
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, portal === "guardian" && styles.tabActive]}
                onPress={() => { setPortal("guardian"); resetFormState(); }}
              >
                <Text style={[styles.tabText, portal === "guardian" && styles.tabTextActive]}>
                  ولي الأمر
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, portal === "staff" && styles.tabActive]}
                onPress={() => { setPortal("staff"); resetFormState(); }}
              >
                <Text style={[styles.tabText, portal === "staff" && styles.tabTextActive]}>
                  الإدارة والموظفون
                </Text>
              </TouchableOpacity>
            </View>

            {errorMsg && <AlertBanner message={errorMsg} type="error" />}

            {/* Form Container */}
            <View style={styles.card}>
              {portal === "student" && (
                <View>
                  <Text style={styles.cardTitle}>الدخول إلى حساب الطالب</Text>
                  <Text style={styles.cardDesc}>
                    أدخل رقم الهوية أو الإقامة ورقم الطالب المسجل في C-Smart
                  </Text>

                  <Input
                    label="رقم الهوية أو الإقامة"
                    placeholder="10 أرقام"
                    keyboardType="numeric"
                    maxLength={10}
                    value={studentNid}
                    onChangeText={setStudentNid}
                  />

                  <Input
                    label="رقم الطالب الداخلي (C-Smart)"
                    placeholder="رقم الطالب المدرسي"
                    value={studentCsmart}
                    onChangeText={setStudentCsmart}
                  />

                  <Button
                    title="تسجيل الدخول"
                    onPress={handleStudentSubmit}
                    loading={loading}
                    disabled={!studentNid || !studentCsmart}
                    style={{ marginTop: 12 }}
                  />
                </View>
              )}

              {portal === "guardian" && (
                <View>
                  <Text style={styles.cardTitle}>الدخول إلى حساب ولي الأمر</Text>
                  <Text style={styles.cardDesc}>
                    أدخل رقم الهوية لتصلك رسالة تحقق برمز الدخول عبر واتساب
                  </Text>

                  {!challenge ? (
                    <>
                      <Input
                        label="رقم الهوية أو الإقامة"
                        placeholder="10 أرقام"
                        keyboardType="numeric"
                        maxLength={10}
                        value={nid}
                        onChangeText={setNid}
                      />
                      <Button
                        title="إرسال رمز التحقق"
                        onPress={handleRequestCode}
                        loading={loading}
                        disabled={nid.length !== 10}
                        style={{ marginTop: 12 }}
                      />
                    </>
                  ) : (
                    <>
                      <Text style={styles.maskedText}>
                        تم إرسال الرمز إلى الرقم المسجل: {challenge.masked}
                      </Text>
                      <Input
                        label="رمز التحقق (6 أرقام)"
                        placeholder="000000"
                        keyboardType="numeric"
                        maxLength={6}
                        value={code}
                        onChangeText={setCode}
                      />
                      <Button
                        title="تأكيد الدخول"
                        onPress={handleVerifyCode}
                        loading={loading}
                        disabled={code.length !== 6}
                        style={{ marginTop: 10 }}
                      />
                      <View style={styles.resendRow}>
                        <Button
                          title={countdown > 0 ? `إعادة الإرسال (${countdown})` : "إعادة إرسال الرمز"}
                          variant="ghost"
                          disabled={countdown > 0 || loading}
                          onPress={handleRequestCode}
                          style={{ flex: 1 }}
                        />
                        <Button
                          title="تغيير الرقم"
                          variant="ghost"
                          onPress={resetFormState}
                          style={{ flex: 1 }}
                        />
                      </View>
                    </>
                  )}
                </View>
              )}

              {portal === "staff" && (
                <View>
                  <Text style={styles.cardTitle}>الدخول للكادر التعليمي والإداري</Text>
                  
                  {/* Mode switcher for staff */}
                  <View style={styles.subTabRow}>
                    <TouchableOpacity
                      style={[styles.subTab, staffAuthMode === "otp" && styles.subTabActive]}
                      onPress={() => { setStaffAuthMode("otp"); resetFormState(); }}
                    >
                      <Text style={[styles.subTabText, staffAuthMode === "otp" && styles.subTabTextActive]}>
                        رمز التحقق (الهوية)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.subTab, staffAuthMode === "password" && styles.subTabActive]}
                      onPress={() => { setStaffAuthMode("password"); resetFormState(); }}
                    >
                      <Text style={[styles.subTabText, staffAuthMode === "password" && styles.subTabTextActive]}>
                        كلمة المرور
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {staffAuthMode === "otp" ? (
                    !challenge ? (
                      <>
                        <Input
                          label="رقم الهوية أو الإقامة"
                          placeholder="10 أرقام"
                          keyboardType="numeric"
                          maxLength={10}
                          value={nid}
                          onChangeText={setNid}
                        />
                        <Button
                          title="إرسال رمز التحقق"
                          onPress={handleRequestCode}
                          loading={loading}
                          disabled={nid.length !== 10}
                          style={{ marginTop: 12 }}
                        />
                      </>
                    ) : (
                      <>
                        <Text style={styles.maskedText}>
                          الرمز مرسل إلى: {challenge.masked}
                        </Text>
                        <Input
                          label="رمز التحقق (6 أرقام)"
                          placeholder="000000"
                          keyboardType="numeric"
                          maxLength={6}
                          value={code}
                          onChangeText={setCode}
                        />
                        <Button
                          title="تأكيد الدخول"
                          onPress={handleVerifyCode}
                          loading={loading}
                          disabled={code.length !== 6}
                          style={{ marginTop: 10 }}
                        />
                        <View style={styles.resendRow}>
                          <Button
                            title={countdown > 0 ? `إعادة الإرسال (${countdown})` : "إعادة إرسال"}
                            variant="ghost"
                            disabled={countdown > 0 || loading}
                            onPress={handleRequestCode}
                            style={{ flex: 1 }}
                          />
                          <Button
                            title="تغيير الرقم"
                            variant="ghost"
                            onPress={resetFormState}
                            style={{ flex: 1 }}
                          />
                        </View>
                      </>
                    )
                  ) : (
                    <>
                      <Input
                        label="اسم المستخدم أو البريد الإلكتروني"
                        placeholder="اسم المستخدم أو البريد"
                        autoCapitalize="none"
                        value={staffIdentifier}
                        onChangeText={setStaffIdentifier}
                      />
                      <Input
                        label="كلمة المرور"
                        placeholder="••••••••"
                        secureTextEntry
                        value={staffPassword}
                        onChangeText={setStaffPassword}
                      />
                      <Button
                        title="دخول"
                        onPress={handlePasswordSubmit}
                        loading={loading}
                        disabled={!staffIdentifier || !staffPassword}
                        style={{ marginTop: 12 }}
                      />
                    </>
                  )}
                </View>
              )}
            </View>

            <Text style={styles.footerNote}>
              البيئة: تجريبية معزولة (Staging / Test Sandbox)
            </Text>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  tabContainer: {
    flexDirection: "row-reverse", // RTL
    backgroundColor: COLORS.inputBg,
    borderRadius: 14,
    padding: 4,
    marginVertical: 14,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: COLORS.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: "bold",
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "right",
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "right",
    marginBottom: 16,
    lineHeight: 18,
  },
  maskedText: {
    fontSize: 13,
    color: COLORS.primary,
    textAlign: "right",
    marginBottom: 10,
    fontWeight: "500",
  },
  resendRow: {
    flexDirection: "row-reverse",
    marginTop: 8,
  },
  subTabRow: {
    flexDirection: "row-reverse",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
  },
  subTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 8,
  },
  subTabActive: {
    backgroundColor: "#FFFFFF",
  },
  subTabText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  subTabTextActive: {
    color: COLORS.primary,
    fontWeight: "bold",
  },
  footerNote: {
    textAlign: "center",
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 24,
  },
});
