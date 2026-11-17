import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform, // إصلاح غياب استيراد Platform المحلي الموثق والمطلوب الحفاظ عليه
} from "react-native";
import { useAuth } from "../hooks/useAuth";
import { RikazLogo } from "../components/RikazLogo";
import { Card, Button, Badge } from "../components/UiComponents";
import {
  COLORS,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  ACCESSIBILITY,
  SHADOWS,
} from "../theme/tokens";
import {
  Building2,
  ChevronDown,
  LogOut,
  Users,
  GraduationCap,
  CalendarCheck,
  MessageSquare,
  FileText,
  ShieldCheck,
  Briefcase,
  CheckCircle2,
  Clock,
} from "lucide-react-native";

interface HomeScreenProps {
  onOpenContextPicker?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onOpenContextPicker }) => {
  const { user, activeContext, memberships, permissions, signOut, switchContext } =
    useAuth();

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // ترجمة وتنسيق مسمى الدور
  const getRoleTitle = (role?: string) => {
    switch (role) {
      case "owner":
        return "مالك المؤسسة";
      case "principal":
        return "مدير المدرسة";
      case "vice_principal":
        return "وكيل المدرسة";
      case "teacher":
        return "معلم";
      case "student_affairs":
        return "شؤون الطلاب";
      case "counselor":
        return "موجه طلابي";
      case "guardian":
        return "ولي أمر";
      case "student":
        return "طالب";
      default:
        return role || "عضو";
    }
  };

  // ترجمة مسميات الصلاحيات العربية لتقديمها للمستخدم بصورة واضحة ومهنية
  const getPermissionLabel = (perm: string) => {
    const map: Record<string, string> = {
      "attendance.view": "استعراض سجلات الحضور والغياب",
      "attendance.take": "تسجيل الحضور اليومي والحصص",
      "students.view": "الاطلاع على ملفات وبيانات الطلاب",
      "students.edit": "تحديث البيانات المدرسية للطلاب",
      "grades.view": "استعراض كشوف الدرجات والتقارير",
      "grades.edit": "رصد وتعديل الدرجات الأكاديمية",
      "messages.send": "إرسال الإشعارات والرسائل للأسرة",
      "schedule.view": "الاطلاع على الجدول المدرسي والحصص",
      "reports.view": "استخراج تقارير الأداء والمؤشرات",
    };
    return map[perm] || perm;
  };

  const roleTitle = getRoleTitle(activeContext?.role);
  const schoolName = activeContext?.schoolName || "الفرع المعتمد";

  // الأيقونات السريعة حسب دور المستخدم
  const quickActions = [
    {
      id: "attendance",
      title: "التحضير والغياب",
      desc: "متابعة الحضور اليومي للطلاب",
      icon: CalendarCheck,
      color: COLORS.primary,
      bg: COLORS.primaryLight,
    },
    {
      id: "students",
      title: "قوائم الطلاب",
      desc: "الملفات والبيانات المدرسية",
      icon: GraduationCap,
      color: "#0284C7",
      bg: "#F0F9FF",
    },
    {
      id: "messages",
      title: "الرسائل والتواصل",
      desc: "التواصل الفوري مع أولياء الأمور",
      icon: MessageSquare,
      color: "#D97706",
      bg: "#FFFBEB",
    },
    {
      id: "reports",
      title: "التقارير اليومية",
      desc: "مؤشرات الأداء والسجلات",
      icon: FileText,
      color: "#16A34A",
      bg: "#F0FDF4",
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ------------------- Top Navigation Bar ------------------- */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={signOut}
          style={styles.iconBtn}
          accessibilityLabel="تسجيل الخروج"
          hitSlop={ACCESSIBILITY.standardHitSlop}
        >
          <LogOut size={20} color={COLORS.mutedForeground} />
        </TouchableOpacity>

        {/* زر تبديل المدرسة والسياق */}
        <TouchableOpacity
          onPress={() => setSwitcherOpen(true)}
          style={styles.contextSelector}
          activeOpacity={0.7}
          accessibilityLabel={`المدرسة الحالية: ${schoolName}، اضغط للتبديل`}
        >
          <ChevronDown size={16} color={COLORS.primary} />
          <View style={styles.contextTextGroup}>
            <Text style={styles.schoolNameText} numberOfLines={1}>
              {schoolName}
            </Text>
            <View style={styles.roleBadgeRow}>
              <Badge label={roleTitle} variant="primary" size="sm" />
            </View>
          </View>
          <View style={styles.schoolIconCircle}>
            <Building2 size={16} color={COLORS.primary} />
          </View>
        </TouchableOpacity>

        <RikazLogo size={32} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        {/* Welcome Banner Card */}
        <Card style={styles.welcomeCard} variant="elevated">
          <View style={styles.welcomeRow}>
            <View style={styles.welcomeTextColumn}>
              <Text style={styles.welcomeUser}>
                مرحبًا، {user?.email ? user.email.split("@")[0] : "مستخدم ركاز"}
              </Text>
              <Text style={styles.welcomeMeta}>
                أنت متصل حاليًا بصفة ({roleTitle}) في {schoolName}
              </Text>
            </View>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {user?.email ? user.email.charAt(0).toUpperCase() : "R"}
              </Text>
            </View>
          </View>

          {/* Quick Stats or Status Pill */}
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>
              الجلسة نشطة ومؤمنة عبر بروتوكول المصادقة الداخلي
            </Text>
          </View>
        </Card>

        {/* Quick Actions Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>الوصول السريع</Text>
        </View>

        <View style={styles.actionGrid}>
          {quickActions.map((item) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.actionCard}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={item.title}
              >
                <View
                  style={[styles.actionIconCircle, { backgroundColor: item.bg }]}
                >
                  <Icon size={22} color={item.color} />
                </View>
                <Text style={styles.actionTitle}>{item.title}</Text>
                <Text style={styles.actionDesc}>{item.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* School & Permissions Summary Card */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>صلاحيات الحساب في الفرع</Text>
          <TouchableOpacity onPress={() => setDetailsOpen(true)}>
            <Text style={styles.detailsLink}>عرض التفاصيل</Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.permsCard}>
          <View style={styles.permsHeader}>
            <ShieldCheck size={20} color={COLORS.primary} />
            <Text style={styles.permsCardTitle}>
              الصلاحيات المعتمدة للفرع الحالي
            </Text>
          </View>

          <View style={styles.permsList}>
            {(permissions && permissions.length > 0
              ? permissions.slice(0, 4)
              : [
                  "attendance.view",
                  "students.view",
                  "messages.send",
                  "schedule.view",
                ]
            ).map((p, idx) => (
              <View key={idx} style={styles.permItem}>
                <CheckCircle2 size={16} color={COLORS.success} />
                <Text style={styles.permLabel}>{getPermissionLabel(p)}</Text>
              </View>
            ))}
          </View>

          {memberships.length > 1 && (
            <Button
              title={`لديك ${memberships.length} صفات / فروع — تبديل الفرع`}
              variant="outline"
              size="sm"
              onPress={() => setSwitcherOpen(true)}
              style={{ marginTop: SPACING.md }}
            />
          )}
        </Card>
      </ScrollView>

      {/* ---------------- Modal: Context / School Switcher ---------------- */}
      <Modal
        visible={switcherOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setSwitcherOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>اختر الفرع أو الصفة النشطة</Text>
              <Text style={styles.sheetSub}>
                التبديل يحدث فورياً ويحدّث الصلاحيات وسجلات الفرع
              </Text>
            </View>

            <ScrollView style={styles.sheetList}>
              {memberships.map((m) => {
                const isCurrent =
                  activeContext?.schoolId === m.school_id &&
                  activeContext?.role === m.role;

                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.sheetItem,
                      isCurrent && styles.sheetItemActive,
                    ]}
                    onPress={async () => {
                      if (m.school_id) {
                        await switchContext(
                          m.school_id,
                          m.role,
                          m.school_name || "الفرع المختار",
                          m.org_id
                        );
                      }
                      setSwitcherOpen(false);
                    }}
                  >
                    <View style={styles.sheetItemContent}>
                      <Text style={styles.sheetItemTitle}>
                        {m.school_name || "المدرسة الرئيسية"}
                      </Text>
                      <View style={styles.sheetItemMeta}>
                        <Badge
                          label={getRoleTitle(m.role)}
                          variant={isCurrent ? "primary" : "secondary"}
                          size="sm"
                        />
                      </View>
                    </View>
                    {isCurrent && (
                      <CheckCircle2 size={20} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Button
              title="إغلاق النافذة"
              variant="secondary"
              onPress={() => setSwitcherOpen(false)}
              fullWidth
              style={{ marginTop: SPACING.md }}
            />
          </View>
        </View>
      </Modal>

      {/* ---------------- Modal: Technical Details ---------------- */}
      <Modal
        visible={detailsOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setDetailsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.detailsCard} variant="elevated">
            <Text style={styles.detailsTitle}>بيانات السياق والجلسة الفنية</Text>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsKey}>المعرف:</Text>
              <Text
                style={[
                  styles.detailsValue,
                  { fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
                ]}
              >
                {user?.id ? user.id.slice(0, 16) + "..." : "غير متوفر"}
              </Text>
            </View>

            <View style={styles.detailsRow}>
              <Text style={styles.detailsKey}>المدرسة النشطة:</Text>
              <Text style={styles.detailsValue}>
                {activeContext?.schoolId || "افتراضي"}
              </Text>
            </View>

            <View style={styles.detailsRow}>
              <Text style={styles.detailsKey}>الدور الفعلي:</Text>
              <Text style={styles.detailsValue}>{activeContext?.role}</Text>
            </View>

            <Button
              title="تم"
              onPress={() => setDetailsOpen(false)}
              style={{ marginTop: SPACING.md }}
              fullWidth
            />
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
  topBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  contextSelector: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxWidth: 240,
  },
  schoolIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  contextTextGroup: {
    alignItems: "flex-end",
  },
  schoolNameText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: "700",
    color: COLORS.foreground,
    maxWidth: 130,
  },
  roleBadgeRow: {
    marginTop: 2,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.inputBg,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  welcomeCard: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  welcomeRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  welcomeTextColumn: {
    flex: 1,
    alignItems: "flex-end",
  },
  welcomeUser: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: "800",
    color: COLORS.primaryForeground,
  },
  welcomeMeta: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: "rgba(251, 248, 241, 0.85)",
    marginTop: 4,
    textAlign: "right",
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.primaryForeground,
  },
  statusPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    marginTop: SPACING.md,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4ADE80",
  },
  statusText: {
    fontSize: 11,
    color: COLORS.primaryForeground,
    fontWeight: "500",
  },
  sectionHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: "800",
    color: COLORS.foreground,
  },
  detailsLink: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.primary,
    fontWeight: "600",
  },
  actionGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  actionCard: {
    width: "47.5%",
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "flex-end",
    ...SHADOWS.sm,
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
  },
  actionTitle: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: "700",
    color: COLORS.foreground,
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.mutedForeground,
    textAlign: "right",
    lineHeight: 16,
  },
  permsCard: {
    padding: SPACING.lg,
  },
  permsHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  permsCardTitle: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  permsList: {
    gap: SPACING.sm,
  },
  permItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.inputBg,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  permLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.foreground,
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(11, 36, 37, 0.5)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
    maxHeight: "80%",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginBottom: SPACING.md,
  },
  sheetHeader: {
    alignItems: "flex-end",
    marginBottom: SPACING.md,
  },
  sheetTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: "800",
    color: COLORS.foreground,
  },
  sheetSub: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
  sheetList: {
    maxHeight: 280,
  },
  sheetItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.inputBg,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: "transparent",
  },
  sheetItemActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  sheetItemContent: {
    alignItems: "flex-end",
  },
  sheetItemTitle: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  sheetItemMeta: {
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(11, 36, 37, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  detailsCard: {
    width: "100%",
    maxWidth: 360,
    padding: SPACING.lg,
  },
  detailsTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: "800",
    color: COLORS.foreground,
    marginBottom: SPACING.md,
    textAlign: "right",
  },
  detailsRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  detailsKey: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.mutedForeground,
  },
  detailsValue: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.foreground,
    fontWeight: "700",
  },
});
