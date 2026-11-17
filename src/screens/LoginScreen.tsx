import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from "react-native";
import { BrandHeader } from "../components/BrandHeader";
import {
  Button,
  Input,
  SegmentedTabs,
  Card,
  NoticeBanner,
  TabOption,
} from "../components/UiComponents";
import {
  COLORS,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  ACCESSIBILITY,
  SHADOWS,
} from "../theme/tokens";
import {
  studentSignIn,
  requestIdCode,
  verifyIdCode,
  passwordSignIn,
} from "../api/auth";
import { useAuth } from "../hooks/useAuth";
import {
  GraduationCap,
  HeartHandshake,
  Building2,
  Sparkles,
  ShieldCheck,
  KeyRound,
  MessageSquare,
} from "lucide-react-native";

type UserCategory = "student" | "guardian" | "staff";

interface CategoryMeta {
  key: UserCategory;
  tab: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}

export const LoginScreen: React.FC = () => {
  const { setSessionManually } = useAuth();

  // الفئة المختارة: الطالب، ولي الأمر، الإدارة والموظفون
  const [category, setCategory] = useState<UserCategory>("student");

  // حقول الطالب
  const [studentNid, setStudentNid] = useState("");
  const [studentCsmart, setStudentCsmart] = useState("");

  // حقول ولي الأمر والموظفين عبر OTP
  const [idNumber, setIdNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);

  // وضع دخول الموظفين: "otp" أو "password"
  const [staffMode, setStaffMode] = useState<"otp" | "password">("password");
  const [staffIdentifier, setStaffIdentifier] = useState("");
  const [staffPassword, setStaffPassword] = useState("");

  // حالة مالك المنصة
  const [ownerModalOpen, setOwnerModalOpen] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");

  // حالات التحميل والخطأ
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);

  // مؤقت إعادة إرسال OTP
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // مسح الأخطاء عند تبديل الفئة
  function handleCategoryChange(cat: UserCategory) {
    setCategory(cat);
    setErrorMessage(null);
    setInfoNotice(null);
    setChallengeId(null);
    setOtpCode("");
  }

  /* -------------------------------------------------------------------------- */
  /*                             تدفق دخول الطالب                                */
  /* -------------------------------------------------------------------------- */
  async function handleStudentLogin() {
    setErrorMessage(null);
    setInfoNotice(null);

    const cleanNid = studentNid.replace(/\D/g, "");
    const cleanCsmart = studentCsmart.trim();

    if (cleanNid.length !== 10) {
      setErrorMessage("أدخل رقم هوية أو إقامة صحيحًا مكونًا من 10 أرقام.");
      return;
    }
    if (!cleanCsmart) {
      setErrorMessage("أدخل رقم الطالب الداخلي في C‑Smart.");
      return;
    }

    setLoading(true);
    try {
      const data = await studentSignIn(cleanNid, cleanCsmart);
      if (data?.session) {
        await setSessionManually(data.session);
      }
    } catch (err: any) {
      // توضيح حالة الخادم بشفافية إذا لم تكن مسارات Edge Function مرفوعة بعد
      if (err?.message?.includes("Network") || err?.message?.includes("404")) {
        setErrorMessage(
          "مسار التحقق الآلي للطلاب بانتظار اكتمال ربط خادم API على بيئة الاختبار. للدخول المباشر حالياً، استخدم بوابة الموظفين بكلمة المرور."
        );
      } else {
        setErrorMessage(err?.message || "تعذر إتمام الدخول بالبيانات المدخلة.");
      }
    } finally {
      setLoading(false);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                           تدفق رمز التحقق (OTP)                             */
  /* -------------------------------------------------------------------------- */
  async function handleRequestOtp(portal: "guardian" | "staff") {
    setErrorMessage(null);
    setInfoNotice(null);

    const cleanNid = idNumber.replace(/\D/g, "");
    if (!/^[12]\d{9}$/.test(cleanNid)) {
      setErrorMessage("أدخل رقم هوية أو إقامة صحيحًا يبدأ بـ 1 أو 2.");
      return;
    }

    setLoading(true);
    try {
      const res = await requestIdCode(cleanNid, portal);
      setChallengeId(res.challenge);
      setMaskedPhone(res.masked || "جوالك المسجل");
      setTimer(60);
      setInfoNotice(`تم إرسال رمز التحقق في واتساب إلى ${res.masked || "جوالك"}`);
    } catch (err: any) {
      if (err?.message?.includes("Network") || err?.message?.includes("404")) {
        setErrorMessage(
          "خدمة إرسال OTP عبر واتساب تتطلب نشر مسارات API الخادمية المخصصة. يمكنك تسجيل الدخول المباشر باسم المستخدم وكلمة المرور عبر بوابة الموظفين."
        );
      } else {
        setErrorMessage(err?.message || "تعذر إرسال الرمز الآن.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(portal: "guardian" | "staff") {
    if (!challengeId) return;
    setErrorMessage(null);

    const cleanCode = otpCode.replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      setErrorMessage("أدخل رمز التحقق المكون من 6 أرقام.");
      return;
    }

    setLoading(true);
    try {
      const data = await verifyIdCode(challengeId, cleanCode, portal);
      if (data?.session) {
        await setSessionManually(data.session);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "رمز التحقق غير صحيح أو انتهت صلاحيته.");
    } finally {
      setLoading(false);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                      تدفق الموظفين بكلمة المرور (المباشر)                    */
  /* -------------------------------------------------------------------------- */
  async function handleStaffPasswordLogin() {
    setErrorMessage(null);
    setInfoNotice(null);

    const ident = staffIdentifier.trim();
    if (!ident) {
      setErrorMessage("أدخل اسم المستخدم أو البريد أو رقم الهوية.");
      return;
    }
    if (staffPassword.length < 6) {
      setErrorMessage("أدخل كلمة المرور بشكل صحيح.");
      return;
    }

    setLoading(true);
    try {
      const data = await passwordSignIn(ident, staffPassword);
      if (data?.session) {
        await setSessionManually(data.session);
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message || "بيانات الدخول غير صحيحة. تحقق من اسم المستخدم وكلمة المرور."
      );
    } finally {
      setLoading(false);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                           تدفق مالك المنصة                                 */
  /* -------------------------------------------------------------------------- */
  async function handlePlatformOwnerLogin() {
    setErrorMessage(null);
    const email = ownerEmail.trim().toLowerCase();
    if (!email || !ownerPassword) {
      setErrorMessage("أدخل بريد وكلمة مرور مالك المنصة.");
      return;
    }

    setLoading(true);
    try {
      const data = await passwordSignIn(email, ownerPassword);
      if (data?.session) {
        setOwnerModalOpen(false);
        await setSessionManually(data.session);
      }
    } catch (err: any) {
      setErrorMessage("تعذر التحقق من حساب مالك المنصة.");
    } finally {
      setLoading(false);
    }
  }

  const categoryOptions: TabOption<UserCategory>[] = [
    {
      key: "student",
      label: "الطالب",
      icon: <GraduationCap size={18} color={category === "student" ? COLORS.primary : COLORS.mutedForeground} />,
    },
    {
      key: "guardian",
      label: "ولي الأمر",
      icon: <HeartHandshake size={18} color={category === "guardian" ? COLORS.primary : COLORS.mutedForeground} />,
    },
    {
      key: "staff",
      label: "الموظفون",
      icon: <Building2 size={18} color={category === "staff" ? COLORS.primary : COLORS.mutedForeground} />,
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Header */}
          <View style={styles.headerSection}>
            <BrandHeader size="lg" />
            <Text style={styles.welcomeTitle}>مرحبًا بك في ركاز</Text>
            <Text style={styles.welcomeSubtitle}>
              منصة عربية واحدة تجمع المدرسة وفروعها ومعلميها وطلابها وأولياء أمورهم.
            </Text>
          </View>

          {/* Main Card */}
          <Card style={styles.loginCard} variant="elevated">
            {/* Category Selector */}
            <SegmentedTabs
              options={categoryOptions}
              activeKey={category}
              onSelect={handleCategoryChange}
            />

            {/* Banner description matching platform */}
            <View style={styles.descBanner}>
              <Sparkles size={16} color={COLORS.primary} style={{ marginTop: 2 }} />
              <Text style={styles.descBannerText}>
                {category === "student" &&
                  "برقم الهوية أو الإقامة ورقم الطالب في C‑Smart (دون كلمة مرور أو رمز)."}
                {category === "guardian" &&
                  "برقم الهوية أو الإقامة ورمز تحقق يصل إلى جوالك المسجل في المدرسة."}
                {category === "staff" &&
                  "الدخول بحساب الإدارة والموظفين المعتمد عبر الهوية وOTP أو كلمة المرور."}
              </Text>
            </View>

            {/* Error & Info notices */}
            {errorMessage && (
              <NoticeBanner message={errorMessage} variant="error" />
            )}
            {infoNotice && (
              <NoticeBanner message={infoNotice} variant="info" />
            )}

            {/* --------------------- بوابـة الطالـب --------------------- */}
            {category === "student" && (
              <View style={styles.formContainer}>
                <Input
                  label="رقم الهوية أو الإقامة"
                  placeholder="10 أرقام تبدأ بـ 1 أو 2"
                  inputMode="numeric"
                  maxLength={10}
                  value={studentNid}
                  onChangeText={setStudentNid}
                />

                <Input
                  label="رقم الطالب الداخلي — C‑Smart"
                  placeholder="أدخل رقم C-Smart المسجل"
                  value={studentCsmart}
                  onChangeText={setStudentCsmart}
                  helperText="الرقم التعريفي للطالب في نظام C-Smart الخاص بالمدرسة"
                />

                <Button
                  title="دخول الطالب"
                  onPress={handleStudentLogin}
                  loading={loading}
                  fullWidth
                  style={{ marginTop: SPACING.sm }}
                />
              </View>
            )}

            {/* ------------------- بوابـة ولـي الأمـر ------------------- */}
            {category === "guardian" && (
              <View style={styles.formContainer}>
                {!challengeId ? (
                  <>
                    <Input
                      label="رقم الهوية أو الإقامة"
                      placeholder="10 أرقام"
                      inputMode="numeric"
                      maxLength={10}
                      value={idNumber}
                      onChangeText={setIdNumber}
                      helperText="سيصل رمز التحقق في رسالة واتساب إلى الجوال المسجل بالمدرسة"
                    />

                    <Button
                      title="إرسال رمز التحقق"
                      onPress={() => handleRequestOtp("guardian")}
                      loading={loading}
                      fullWidth
                      style={{ marginTop: SPACING.sm }}
                    />
                  </>
                ) : (
                  <>
                    <View style={styles.otpHeader}>
                      <Text style={styles.otpTitle}>أدخل رمز التحقق</Text>
                      <Text style={styles.otpSub}>
                        الرمز المكون من 6 أرقام المرسل إلى {maskedPhone}
                      </Text>
                    </View>

                    <Input
                      label="رمز التحقق (OTP)"
                      placeholder="••••••"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpCode}
                      onChangeText={setOtpCode}
                      autoFocus
                    />

                    <Button
                      title="تأكيد الدخول"
                      onPress={() => handleVerifyOtp("guardian")}
                      loading={loading}
                      fullWidth
                      disabled={otpCode.length !== 6}
                      style={{ marginTop: SPACING.sm }}
                    />

                    <View style={styles.otpActions}>
                      <TouchableOpacity
                        disabled={timer > 0 || loading}
                        onPress={() => handleRequestOtp("guardian")}
                        style={styles.resendBtn}
                      >
                        <Text
                          style={[
                            styles.resendText,
                            timer > 0 && styles.resendTextDisabled,
                          ]}
                        >
                          {timer > 0
                            ? `إعادة الإرسال بعد (${timer}ث)`
                            : "إعادة إرسال الرمز"}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          setChallengeId(null);
                          setOtpCode("");
                        }}
                        style={styles.changeBtn}
                      >
                        <Text style={styles.changeText}>تغيير رقم الهوية</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            )}

            {/* ---------------- بوابـة الإدارة والموظفيـن ---------------- */}
            {category === "staff" && (
              <View style={styles.formContainer}>
                {/* مفتاح تبديل الطريقة المعتمدة للموظف */}
                <View style={styles.staffModeSwitch}>
                  <TouchableOpacity
                    onPress={() => setStaffMode("password")}
                    style={[
                      styles.staffModeOption,
                      staffMode === "password" && styles.staffModeOptionActive,
                    ]}
                  >
                    <KeyRound size={14} color={staffMode === "password" ? COLORS.primary : COLORS.mutedForeground} />
                    <Text
                      style={[
                        styles.staffModeText,
                        staffMode === "password" && styles.staffModeTextActive,
                      ]}
                    >
                      اسم المستخدم وكلمة المرور
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setStaffMode("otp")}
                    style={[
                      styles.staffModeOption,
                      staffMode === "otp" && styles.staffModeOptionActive,
                    ]}
                  >
                    <MessageSquare size={14} color={staffMode === "otp" ? COLORS.primary : COLORS.mutedForeground} />
                    <Text
                      style={[
                        styles.staffModeText,
                        staffMode === "otp" && styles.staffModeTextActive,
                      ]}
                    >
                      رمز التحقق (OTP)
                    </Text>
                  </TouchableOpacity>
                </View>

                {staffMode === "password" ? (
                  <>
                    <Input
                      label="اسم المستخدم أو البريد الإلكتروني"
                      placeholder="username@staff.rikaz.app أو البريد"
                      autoCapitalize="none"
                      autoCorrect={false}
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
                      title="تسجيل الدخول"
                      onPress={handleStaffPasswordLogin}
                      loading={loading}
                      fullWidth
                      style={{ marginTop: SPACING.sm }}
                    />
                  </>
                ) : (
                  <>
                    {!challengeId ? (
                      <>
                        <Input
                          label="رقم الهوية أو الإقامة للموظف"
                          placeholder="10 أرقام"
                          inputMode="numeric"
                          maxLength={10}
                          value={idNumber}
                          onChangeText={setIdNumber}
                          helperText="يجب أن يكون الحساب مسجلًا كموظف في إحدى مدارس ركاز"
                        />

                        <Button
                          title="إرسال رمز التحقق"
                          onPress={() => handleRequestOtp("staff")}
                          loading={loading}
                          fullWidth
                          style={{ marginTop: SPACING.sm }}
                        />
                      </>
                    ) : (
                      <>
                        <View style={styles.otpHeader}>
                          <Text style={styles.otpTitle}>رمز تحقق الموظف</Text>
                          <Text style={styles.otpSub}>
                            الرمز المرسل على واتساب إلى {maskedPhone}
                          </Text>
                        </View>

                        <Input
                          label="رمز التحقق (OTP)"
                          placeholder="••••••"
                          inputMode="numeric"
                          maxLength={6}
                          value={otpCode}
                          onChangeText={setOtpCode}
                          autoFocus
                        />

                        <Button
                          title="تأكيد دخول الموظف"
                          onPress={() => handleVerifyOtp("staff")}
                          loading={loading}
                          fullWidth
                          disabled={otpCode.length !== 6}
                          style={{ marginTop: SPACING.sm }}
                        />

                        <View style={styles.otpActions}>
                          <TouchableOpacity
                            disabled={timer > 0 || loading}
                            onPress={() => handleRequestOtp("staff")}
                          >
                            <Text
                              style={[
                                styles.resendText,
                                timer > 0 && styles.resendTextDisabled,
                              ]}
                            >
                              {timer > 0
                                ? `إعادة الإرسال بعد (${timer}ث)`
                                : "إعادة إرسال الرمز"}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => {
                              setChallengeId(null);
                              setOtpCode("");
                            }}
                          >
                            <Text style={styles.changeText}>تغيير الهوية</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </>
                )}
              </View>
            )}
          </Card>

          {/* Platform Owner entry link at bottom (مطابقة للمنصة) */}
          <TouchableOpacity
            style={styles.ownerLink}
            onPress={() => setOwnerModalOpen(true)}
            hitSlop={ACCESSIBILITY.standardHitSlop}
          >
            <ShieldCheck size={14} color={COLORS.mutedForeground} />
            <Text style={styles.ownerLinkText}>دخول مالك المنصة</Text>
          </TouchableOpacity>

          {/* Footer copyright */}
          <Text style={styles.footerText}>
            منصة ركاز لإدارة المدارس © {new Date().getFullYear()}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Platform Owner Modal */}
      <Modal
        visible={ownerModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setOwnerModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard} variant="elevated">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>دخول مالك المنصة</Text>
              <Text style={styles.modalSubtitle}>
                مخصص لإدارة المؤسسات وإعدادات النظام الشاملة
              </Text>
            </View>

            <Input
              label="البريد الإلكتروني لمالك المنصة"
              placeholder="owner@domain.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={ownerEmail}
              onChangeText={setOwnerEmail}
            />

            <Input
              label="كلمة المرور"
              placeholder="••••••••"
              secureTextEntry
              value={ownerPassword}
              onChangeText={setOwnerPassword}
            />

            <View style={styles.modalBtnRow}>
              <Button
                title="دخول مالك المنصة"
                onPress={handlePlatformOwnerLogin}
                loading={loading}
                style={{ flex: 1 }}
              />
              <Button
                title="إلغاء"
                variant="outline"
                onPress={() => setOwnerModalOpen(false)}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    alignItems: "center",
  },
  headerSection: {
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  welcomeTitle: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: "800",
    color: COLORS.foreground,
    marginTop: SPACING.xs,
    textAlign: "center",
  },
  welcomeSubtitle: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.mutedForeground,
    textAlign: "center",
    maxWidth: 320,
    marginTop: 4,
    lineHeight: 18,
  },
  loginCard: {
    width: "100%",
    maxWidth: 420,
    padding: SPACING.lg,
  },
  descBanner: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    backgroundColor: COLORS.secondary,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  descBannerText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.secondaryForeground,
    lineHeight: 18,
    textAlign: "right",
  },
  formContainer: {
    marginTop: SPACING.xs,
  },
  staffModeSwitch: {
    flexDirection: "row-reverse",
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 3,
    marginBottom: SPACING.md,
  },
  staffModeOption: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  staffModeOptionActive: {
    backgroundColor: COLORS.card,
    ...SHADOWS.sm,
  },
  staffModeText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.mutedForeground,
  },
  staffModeTextActive: {
    color: COLORS.primary,
  },
  otpHeader: {
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  otpTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  otpSub: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.mutedForeground,
    marginTop: 2,
    textAlign: "center",
  },
  otpActions: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  resendBtn: {
    padding: SPACING.xs,
  },
  resendText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.primary,
    fontWeight: "600",
  },
  resendTextDisabled: {
    color: COLORS.mutedForeground,
  },
  changeBtn: {
    padding: SPACING.xs,
  },
  changeText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.mutedForeground,
  },
  ownerLink: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    marginTop: SPACING.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  ownerLinkText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.mutedForeground,
    fontWeight: "600",
  },
  footerText: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    marginTop: SPACING.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(11, 36, 37, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    padding: SPACING.xl,
  },
  modalHeader: {
    alignItems: "flex-end",
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: "800",
    color: COLORS.foreground,
  },
  modalSubtitle: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
  modalBtnRow: {
    flexDirection: "row-reverse",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
});
